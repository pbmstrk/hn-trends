-- ========================================
-- Text search configuration
-- ========================================

create text search configuration tech (copy = simple);
create text search dictionary tech_dict (template = synonym, synonyms = tech_synonyms);
alter text search configuration tech 
  alter mapping for asciiword, asciihword, hword, word, numword, numhword with tech_dict;

-- ========================================
-- Table/view definitions
-- ========================================

-- hacker news submissions 
create table if not exists stories (
  objectid text primary key,
  submission_date text not null,
  created_at_i integer not null,
  title text null,
  author text null,
  year_month text generated always as (substring(submission_date, 1, 7)) stored
);

-- Ask HN: Who Is Hiring? submissions
create view hiring_stories as (
  select * from stories
  where
    author in ('whoishiring', '_whoishiring', 'lpolovets', 'Aloisius')
    and lower(title) like 'ask hn: who is hiring?%' and objectid != '3300371'
);

-- comments on a Ask HN: Who Is Hiring? post
create table  hiring_comments (
  objectid text primary key,
  comment_text text not null,
  storyid text not null,
  parentid text not null,
  created_date text not null,
  is_toplevel_comment boolean generated always as (storyid = parentid) stored,
  year_month text generated always as (substring(created_date, 1 ,7)) stored
);

-- list of keywords that are included in search 
create table if not exists keyword_list (
  keyword text,
  display_name text,
  include_hiring boolean,
  image_path text
);

\copy keyword_list FROM 'words.csv' delimiter ',' csv header

-- log used when processing new hiring posts
create table hiring_posts_log (
  objectid text primary key,
  processed_date timestamp default current_timestamp
);

-- keywords found in submissions 
create table if not exists keywords (
  word text,
  objectid text,
  submission_date text,
  title text,
  year_month text,
  primary key (word, objectid)
);

-- keywords found in hiring comments
create table if not exists hiring_keywords (
  word text,
  objectid text,
  year_month text,
  primary key (word, objectid)
);

-- ========================================
-- Functions/procedures
-- ========================================

create function normalize_terms(text TEXT) 
returns text as $$
begin
    return replace(
        replace(
            replace(
                lower($1),
                'f#', 'fsharp'),
            'c#', 'csharp'),
        'c++', 'cpp');
end;
$$ language plpgsql immutable;


create or replace function get_unprocessed_hiring_stories()
returns table (objectid text) language sql
as $$ 
select 
    s.objectID
from hiring_stories s
where cast(s.submission_date as date) < CURRENT_DATE - interval '5 days'
and not exists (select 1 from hiring_posts_log h where s.objectID = h.objectID);
$$;

create or replace procedure process_keywords()
language plpgsql
as $$
begin
    truncate table keywords, hiring_keywords;

    insert into keywords (word, objectid, submission_date, title, year_month)
    select 
        kl.keyword,
        s.objectid,
        s.submission_date,
        s.title,
        s.year_month
    from keyword_list kl
    cross join lateral (
        select *
        from stories s
        where to_tsvector('tech', normalize_terms(s.title)) @@ to_tsquery('tech', kl.keyword)
    ) s;

    insert into hiring_keywords (word, objectid, year_month)
    select 
        kl.keyword,
        c.objectid,
        c.year_month
    from keyword_list kl
    cross join lateral (
        select *
        from hiring_comments c
        where to_tsvector('tech', normalize_terms(c.comment_text)) @@ to_tsquery('tech', kl.keyword)
    ) c
    where kl.include_hiring = true;
end;
$$;

-- ========================================
-- Indexes
-- ========================================

create index fts_index_stories on stories using gin (to_tsvector('tech', normalize_terms(title)));
create index fts_index_hiring_comments on hiring_comments using gin (to_tsvector('tech', normalize_terms(comment_text)));

-- indexes on author and title are used to lookup Ask HN: Who Is Hiring? stories 
create index idx_stories_author on stories (author);
create index idx_stories_title on stories (lower(title));


CREATE index idx_keywords_word_year_month on keywords (word, year_month);
CREATE index idx_hiring_keywords_word_year_month on hiring_keywords (word, year_month);

-- ========================================
-- Scheduled Tasks
-- ========================================

create extension pg_cron;

select cron.schedule(
  'process-keywords',
  '0 12 * * 0',
  'call process_keywords()'
);

