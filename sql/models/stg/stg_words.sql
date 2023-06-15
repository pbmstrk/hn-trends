with processed_headlines as (
    select title.lower().regexp_replace('[.,:\-''=’]', ' ', 'g').trim() as processed_headline,
    * from {{ ref('stg_hn_stories' )}}
),
word_array as (
    select list_distinct(string_split_regex(processed_headline, '\s+')) as words,
    * from processed_headlines
)
select unnest(words) as word, * from word_array