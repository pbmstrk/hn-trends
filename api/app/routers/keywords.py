from fastapi import APIRouter, Depends 
from sqlalchemy import Connection
from ..db import get_connection, execute_query

router = APIRouter()

@router.get("/")
def get_num_submissions(hiring: bool = False, connection: Connection = Depends(get_connection)):
    if hiring:
        query = "select keyword as value, display_name, include_hiring, image_path from keyword_list where include_hiring"
    else:
        query = "select keyword as value, display_name, include_hiring, image_path from keyword_list"
    result = execute_query(connection, query)
    return result.to_dict("records")
