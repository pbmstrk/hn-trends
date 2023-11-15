from fastapi import APIRouter, Depends 
from sqlalchemy import Connection
from ..db import get_connection, execute_query



SQL_NUM_SUBMISSIONS_QUERY = """
select 
    submission_date, 
    avg(num_submissions) over (order by submission_date range between interval '3' day preceding and interval '3' day following) as moving_avg 
from submissions_per_day;
"""

SQL_SUBMISSION_KEYWORD_OCCURRENCES_QUERY = """
select
    word, 
    year_month, 
    count(title) as num_occurrences
from keywords
where word in :wordlist
group by year_month, word
order by year_month
"""

SQL_SUBMISSION_SAMPLES_QUERY = """
select 
    title, 
    objectID, 
    cast(submission_date as date) as submission_date
from keywords
where word = :keyword
and year_month = :year_month
"""

router = APIRouter()

@router.get("/history")
def get_num_submissions(connection: Connection = Depends(get_connection)):
    result = execute_query(
        connection, SQL_NUM_SUBMISSIONS_QUERY
    )
    return result.to_dict("records")

@router.get("/samples")
def get_submission_samples(year_month: str, keyword: str, connection: Connection = Depends(get_connection)):

    result = execute_query(
        connection, SQL_SUBMISSION_SAMPLES_QUERY, keyword=keyword, year_month=year_month
    )
    sample = result.sample(min(5, result.shape[0]))

    return sample.to_dict("records")


@router.get("/occurrences")
def get_keyword_occurence(keywords: str, connection: Connection = Depends(get_connection)):
    keywords = keywords.split(",")
    result = execute_query(
        connection, SQL_SUBMISSION_KEYWORD_OCCURRENCES_QUERY, wordlist=tuple(keywords)
    )
    return result.pivot(index="year_month", columns="word", values="num_occurrences").reset_index().fillna(0).to_dict("records")