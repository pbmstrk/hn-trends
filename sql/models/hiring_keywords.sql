{{ config(materialized='table') }}

with processed_comments as (
    select comment_text.lower().regexp_replace('[.,:\-''=’<>]', ' ', 'g').trim() as processed_comment,
    * from {{ ref('hn_hiring_comments' )}}
),
word_array as (
    select list_distinct(string_split_regex(processed_comment, '\s+')) as words,
    * from processed_comments
),
word_table as (
    select unnest(words) as word, * from word_array
)

select word, objectID, created_at as comment_creation, story_id, title, year_month
from word_table 
where exists (select 1 from {{ source('raw', 'keywords') }} where word = keyword)
