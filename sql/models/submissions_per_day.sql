with all_days as (
    select range::date as date, 0 as default
    from range(date '2006-10-09', current_date, interval 1 day)
),
submission_days as (
    select submission_date, count(*) as num_submissions
    from {{ ref('stg_hn_stories')}}
    group by 1 
    order by 1
)

select a.date as submission_date, coalesce(s.num_submissions, a.default) as num_submissions
from all_days a 
left join submission_days s 
    on a.date = s.submission_date
where a.date <= (select max(submission_date) - interval '1' day from submission_days)
order by 1 
