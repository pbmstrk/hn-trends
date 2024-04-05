-- all hacker news submissions 
-- (one row per submission)
create table if not exists stories (
  objectid text primary key,
  submission_date text not null,
  created_at_i integer not null,
  title text null,
  author text null,
  year_month text generated always as (substring(submission_date, 1, 7)) stored
);

-- indexes on author and title are used to lookup 
-- _Ask HN: Who Is Hiring?_ stories 
create index idx_stories_author on stories (author);
create index idx_stories_title on stories (lower(title));

-- _Ask HN: Who Is Hiring?_ submissions
create or replace view hiring_stories as (
  select * from stories
  where
    author in ('whoishiring', '_whoishiring', 'lpolovets', 'Aloisius')
    and lower(title) like 'ask hn: who is hiring?%' and objectid != '3300371'
);


-- all comments on a _Ask HN: Who Is Hiring?_ post
-- (one row per comment)
create table if not exists hiring_comments (
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
create table if not exists hiring_posts_log (
  objectid text primary key,
  processed_date timestamp default current_timestamp
);


-- stores all keywords found in submissions 
-- (one row per word per post)
create table if not exists keywords (
  word text,
  objectid text,
  submission_date text,
  title text,
  year_month text,
  primary key (word, objectid)
);

CREATE index idx_keywords_word_year_month on keywords (word, year_month);

create table if not exists hiring_keywords (
  word text,
  objectid text,
  year_month text,
  primary key (word, objectid)
);

CREATE index idx_hiring_keywords_word_year_month on hiring_keywords (word, year_month);


create or replace function get_unprocessed_hiring_stories()
returns table (
  objectid text
) language plpgsql
as $$ 
begin 
    return query 
        select 
            s.objectID
        from hiring_stories s
        where cast(s.submission_date as date) < CURRENT_DATE - interval '5 days'
        and not exists (select 1 from hiring_posts_log h where s.objectID = h.objectID);
end;$$;
