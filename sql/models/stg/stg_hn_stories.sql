with stg_data as (select 
    objectID, 
    title, 
    author,
    timestamp::timestamp as submission_timestamp, 
    url, 
    string_split(url, '/')[3] as source,
    points, 
    num_comments, 
from {{ source('raw', 'hn_stories') }})

select *, submission_timestamp::date as submission_date,
strftime(submission_timestamp, '%Y-%m') as year_month 
from stg_data