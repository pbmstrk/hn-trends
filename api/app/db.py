import os 
from sqlalchemy import create_engine, text, Engine, Connection
from collections.abc import Iterator
import pandas as pd

class MissingEnvVar(Exception):
    pass

def fetch_database_url() -> str:
    """Fetches the database URL from the DATABASE_URL environment variable.
    If the URL starts with 'postgres://', it replaces this with 'postgresql://'."""
    database_url = os.getenv("DATABASE_URL")
    if database_url is None:
        raise MissingEnvVar("DATABASE_URL environment variable does not exist.")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://",  "postgresql://", 1)
    return database_url

def execute_query(connection: Connection, sql: str, **query_params) -> pd.DataFrame:
    """Executes an SQL query and returns the result as a DataFrame."""
    query = text(sql).bindparams(**query_params)
    return pd.read_sql(query, connection)
    
def create_db_engine() -> Engine:
    db_url = fetch_database_url()
    return create_engine(db_url, pool_pre_ping=True, pool_recycle=3600)

engine = create_db_engine()

def get_connection() -> Iterator[Connection]:
    with engine.connect() as connection:
        yield connection