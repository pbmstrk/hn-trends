{{ config(materialized='table') }}

select word, objectID, points, num_comments, submission_date, title, year_month from {{ ref('stg_words') }}
where exists (select 1 from {{ source('raw', 'keywords')}} where word = keyword)
and year_month <= (select strftime(max(submission_date) - interval 1 month, '%Y-%m') from {{ ref('stg_words') }})