from fastapi import APIRouter, Depends 
from sqlalchemy import Connection
from ..db import get_connection, execute_query

SQL_KEYWORD_HIRING_OCCURENCES_QUERY = """
    select word, year_month, count(objectID) as num_occurences
    from hiring_keywords
    where word in :wordlist
    group by year_month, word
    order by year_month
"""

router = APIRouter()

@router.get("/history")
def get_num_hiring(toplevel_only: bool = True, connection: Connection = Depends(get_connection)):
    if toplevel_only:
        query = """
        select year_month, count(*) as num_comments
        from hiring_comments 
        where is_toplevel_comment
        group by year_month
        order by year_month"""
    else:
        query = """
        select year_month, count(*) as num_comments
        from hiring_comments 
        group by year_month
        order by year_month"""
    dff = execute_query(connection, query)
    return dff.to_dict("records")
    
@router.get("/occurrences")
def get_hiring_keyword_occurence(keywords: str, connection: Connection = Depends(get_connection)):
    keywords = keywords.split(",")
    result = execute_query(
        connection, SQL_KEYWORD_HIRING_OCCURENCES_QUERY, wordlist=tuple(keywords)
    )
    return result.pivot(index="year_month", columns="word", values="num_occurences").reset_index().fillna(0).to_dict("records")
