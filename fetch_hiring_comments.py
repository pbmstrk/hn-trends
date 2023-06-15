import duckdb
import itertools 
import requests
import pyarrow as pa 
import pyarrow.parquet as pq
import datetime
from tqdm.auto import tqdm
import pandas as pd


def filter_keys(d):
    """Filters the dictionary based on a set of valid keys."""
    valid_keys = set(
        [
            "created_at",
            "created_at_i",
            "author",
            "parent_id",
            "story_id",
            "objectID",
            "comment_text"
        ]
    )
    return {k: v for k, v in d.items() if k in valid_keys}


def fetch_comments(objectID):
    results = []
    params = {"tags": f"comment,story_{objectID}", "hitsPerPage": 100}
    url = "https://hn.algolia.com/api/v1/search"
    resp_json = requests.get(url, params=params).json()
    results.extend(resp_json["hits"])
    nb_pages = resp_json["nbPages"]
    for page in range(1, nb_pages):
        params["page"] = page 
        resp_json = requests.get(url, params=params).json()
        results.extend(resp_json["hits"])
    return results

if __name__ == "__main__":

    con = duckdb.connect("hndata.duckdb")
    con.execute(
        """create table if not exists hn_hiring_comments(
            created_at varchar, 
            author varchar,
            comment_text varchar,
            story_id int,
            parent_id int, 
            created_at_i int,
            objectID varchar primary key);
    """)

    res = con.execute(
        """select objectID from analysis.stg_hn_stories
        where author in ('whoishiring','_whoishiring', 'lpolovets', 'Aloisius')  and 
        lower(title) like 'ask hn: who is hiring?%' and objectID <> '3300371'
        """
    ).fetchall()
    object_ids = itertools.chain.from_iterable(res)
    results = []
    for object_id in tqdm(object_ids):
        comments = fetch_comments(object_id)
        filtered = [filter_keys(c) for c in comments]
        results.extend(filtered)

    table = pa.Table.from_pylist(results)
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    pq.write_table(table, f"data/hn_hiring_comments_{timestamp}.parquet")

    df = pd.DataFrame.from_dict(results)
    con.execute("insert or replace into hn_hiring_comments select * from df;")

    


    