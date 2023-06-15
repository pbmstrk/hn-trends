select 
    cast(c.created_at as timestamp) as created_at,
    c.author,
    c.comment_text,
    c.story_id,
    c.parent_id, 
    c.created_at_i,
    c.objectID,
    c.story_id = c.parent_id as is_toplevel_comment,
    s.year_month,
    s.title
from {{ source('raw', 'hn_hiring_comments')}} c
join {{ ref('stg_hn_stories') }} s 
on c.story_id = s.objectID 