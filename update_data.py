import requests
import duckdb
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import datetime
from tqdm.auto import tqdm


def filter_keys(d):
    """Filters the dictionary based on a set of valid keys."""
    valid_keys = set(
        [
            "created_at",
            "created_at_i",
            "title",
            "author",
            "points",
            "num_comments",
            "objectID",
            "url"
        ]
    )
    return {k: v for k, v in d.items() if k in valid_keys}


OP_TO_SYMBOL = {"lt": "<", "gt": ">"}


def create_numeric_filter(field, op, val):
    """Creates a numeric filter for a given field, operation, and value."""
    return field + OP_TO_SYMBOL[op] + str(val)


def is_valid_filter(filter_string):
    """Checks if the filter string is valid."""
    return len(filter_string) > 0


class HNDataAlgolia:
    """A class that fetches and yields stories from the HN Algolia API."""
    def __init__(self):
        self._sess = requests.Session()
        self._base_url = "http://hn.algolia.com/api/v1/search_by_date"

    def yield_stories(self, creation_lb=None, creation_ub=None):
        params = {"tags": "story", "hitsPerPage": 1000}
        lb_filter, ub_filter = "", ""
        if creation_lb is not None:
            lb_filter = create_numeric_filter("created_at_i", "gt", creation_lb)
        if creation_ub is not None:
            ub_filter = create_numeric_filter("created_at_i", "lt", creation_ub)
        if lb_filter or ub_filter:
            bounds = filter(is_valid_filter, [lb_filter, ub_filter])
            numeric_filter = ",".join(bounds)
            params = {**params, "numericFilters": numeric_filter}
        while True:
            try:
                resp = self._sess.get(self._base_url, params=params)
                resp.raise_for_status()
            except requests.HTTPError as e:
                print(f'Request failed with error {e}')
                break
            resp_json = resp.json()
            if not resp_json["hits"]:
                return
            for hit in resp_json["hits"]:
                yield filter_keys(hit)
            ub_filter = create_numeric_filter("created_at_i", "lt", hit["created_at_i"])
            params["numericFilters"] = ",".join(
                filter(is_valid_filter, [lb_filter, ub_filter])
            )


if __name__ == "__main__":

    hndata = HNDataAlgolia()
    con = duckdb.connect("hndata.duckdb")
    results = []
    con.sql(
        """create table if not exists hn_stories(
            timestamp varchar, 
            title varchar,
            url varchar,
            author varchar,
            points int, 
            num_comments int,
            created_at_i int,
            objectID varchar primary key,
            record_created_at varchar);
        """
    )
    recent_timestamp_result = con.sql(
        """select created_at_i from hn_stories 
            order by created_at_i desc limit 1;"""
    ).fetchall()
    print(recent_timestamp_result)
    creation_ub = int(
        (datetime.datetime.now() - datetime.timedelta(days=4)).timestamp()
    )
    creation_lb = recent_timestamp_result[0][0] if recent_timestamp_result else None

    for hit in tqdm(
        hndata.yield_stories(creation_lb=creation_lb, creation_ub=creation_ub)
    ):
        record_creation = datetime.datetime.now().isoformat(timespec="milliseconds")
        hit["record_created_at"] = record_creation + "Z"
        results.append(hit)

    print(len(results))

    table = pa.Table.from_pylist(results)
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    pq.write_table(table, f"data/hn_stories_{timestamp}.parquet")

    df = pd.DataFrame.from_dict(results)
    con.sql("insert into hn_stories select * from df")

    
