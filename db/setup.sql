-- all hacker news submissions 
-- (one row per submission)
create table if not exists stories (
  objectid text primary key,
  submission_date text not null,
  created_at_i integer not null,
  title text null,
  author text null
);

-- indexes on author and title are used to lookup 
-- _Ask HN: Who Is Hiring?_ stories 
create index idx_stories_author on stories (author);
create index idx_stories_title on stories (lower(title));
-- the incremental load uses the objectid cast as an int 
-- to retrieve new records 
create index idx_stories_objectid on stories (cast(objectid as int));

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

-- watermark table used to identify new records for incremental load
create table if not exists watermark (
  table_name text primary key,
  last_processed_id int
);

insert into watermark (table_name, last_processed_id)
values ('keywords', 0), ('hiring_keywords', 0);

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


create or replace function distinct_words(arr text [])
returns text []
as $$
select array_agg(distinct word) from unnest(arr) as t(word)
$$ language sql;


create or replace procedure update_keywords()
language plpgsql
as $$
declare
    last_id int;
begin
    -- Retrieve the last processed id
    select last_processed_id into last_id from watermark where table_name = 'keywords';

    -- Perform incremental update
    insert into keywords (word, objectID, submission_date, title, year_month)
    with processed_stories as (
        select
            *,
            lower(trim(regexp_replace(title, '[.,:\-''=’]', ' ', 'g'))) as processed_title
        from stories
        where cast(objectId as int) > COALESCE(last_id, 0)
    ),
    word_array as (
        select
            *,
            distinct_words(regexp_split_to_array(processed_title, '\s+')) as words
        from processed_stories
    ),
    unnested_table as (
        select
            objectId,
            submission_date,
            title,
            word,
            substring(submission_date, 1, 7) as year_month
        from word_array, unnest(words) as word
    )
    select
        word,
        objectID,
        submission_date,
        title,
        year_month
    from unnested_table
    where exists (select 1 from keyword_list where keyword = word);

    -- Update the watermark table with the latest id
    UPDATE watermark SET last_processed_id = (SELECT MAX(cast(objectId as bigint)) FROM stories) WHERE table_name = 'keywords';
END;
$$;

create or replace procedure update_hiring_keywords()
language plpgsql
as $$
declare
    last_id int;
begin
    -- Retrieve the last processed id
    select last_processed_id into last_id from watermark where table_name = 'hiring_keywords';

    -- Perform incremental update
    insert into hiring_keywords (word, objectid, year_month)
    with processed_comments as (
    select
      *,
      lower(
        trim(regexp_replace(comment_text, '[.,:\-''=’/]', ' ', 'g'))
      ) as processed_comment
    from hiring_comments
    where cast(objectid as int) > coalesce(last_id, 0)
  ),

  word_array as (
    select
      *,
      distinct_words(regexp_split_to_array(processed_comment, '\s+')) as words
    from processed_comments
  ),

  unnested_table as (
    select
      objectId,
      year_month,
      word
    from word_array, unnest(words) as word
  )

  select
    word,
    objectid,
    year_month
  from unnested_table
  where exists (select 1 from keyword_list where keyword = word);

    -- Update the watermark table with the latest id
    update watermark set last_processed_id = (select max(cast(objectId as bigint)) from stories) where table_name = 'hiring_keywords';
end;
$$;


create materialized view submissions_per_day as (
    with all_days as (
        select generate_series::date as date, 0 as default 
        from generate_series((select cast(min(submission_date) as date) from stories), current_date, interval '1 day')    ),
    submission_days as (
        select cast(submission_date as date) as sd, count(*) as num_submissions
        from stories 
        group by 1 
        order by 1
    )
    select a.date as submission_date, coalesce(s.num_submissions, a.default) as num_submissions
    from all_days a 
    left join submission_days s 
        on a.date = s.sd
    where a.date <=  (select max(sd) - interval '1 day' from submission_days)
    order by 1
);


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
