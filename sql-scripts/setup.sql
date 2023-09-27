create table if not exists stories (
  objectid text primary key,
  submission_date text not null,
  created_at_i integer not null,
  title text not null,
  author text not null
);

create index idx_stories_author on stories (author);
create index idx_stories_title on stories (lower(title));

create table if not exists hiring_comments (
  objectid text primary key,
  comment_text text not null,
  storyid text not null,
  parentid text not null,
  created_date text not null,
  is_toplevel_comment boolean generated always as (storyid = parentid) stored,
  year_month text generated always as (substring(created_date, 1 ,7)) stored
);


create table if not exists keyword_list (
  keyword text,
  display_name text,
  include_hiring boolean
);

create table if not exists hiring_posts_log (
  objectid text primary key,
  processed_date timestamp default current_timestamp
);

create or replace view hiring_stories as (
  select * from stories
  where
    author in ('whoishiring', '_whoishiring', 'lpolovets', 'Aloisius')
    and lower(title) like 'ask hn: who is hiring?%' and objectid != '3300371'
);


\copy keyword_list FROM 'words.csv' delimiter ',' csv header

create or replace function distinct_words(arr text [])
returns text []
as $$
select array_agg(distinct word) from unnest(arr) as t(word)
$$ language sql;


create materialized view keywords as (
  with processed_stories as (
    select
      *,
      lower(
        trim(regexp_replace(title, '[.,:\-''=’]', ' ', 'g'))
      ) as processed_title
    from stories
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
  where exists (select 1 from keyword_list where keyword = word)
);

CREATE index idx_keywords_word_year_month on keywords (word, year_month);


create materialized view hiring_keywords as (
  with processed_comments as (
    select
      *,
      lower(
        trim(regexp_replace(comment_text, '[.,:\-''=’/]', ' ', 'g'))
      ) as processed_comment
    from hiring_comments
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
  where exists (select 1 from keyword_list where keyword = word)
);

CREATE index idx_hiring_keywords_word_year_month on hiring_keywords (word, year_month);


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
