import itertools
import duckdb 
import logging 
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class MissingEnvironmentVariable(Exception):
    pass

POSTGRES_USER = os.getenv("POSTGRES_USER")
if POSTGRES_USER is None:
    raise MissingEnvironmentVariable("POSTGRES_USER environment variable not found.")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
if POSTGRES_PASSWORD is None:
    raise MissingEnvironmentVariable("POSTGRES_PASSWORD environment variable not found.")


SQL_STATEMENT_SUBMISSIONS = """
insert into keywords 
select '{}', objectid, submission_date, title, year_month
  from (
      select *, fts_main_stories.match_bm25(
          objectid,
          '{}',
          fields := 'title'
      ) AS score
      FROM stories
  ) sq
  where score is not null;
"""

SQL_STATEMENT_HIRING = """
insert into hiring_keywords 
select '{}', objectid, year_month
  from (
      select *, fts_main_hiring_comments.match_bm25(
          objectid,
          '{}',
          fields := 'comment_text'
      ) AS score
      FROM hiring_comments
  ) sq
  where score is not null;
"""


connection = duckdb.connect()
logging.info("Loading & installing postgres extension...")
connection.install_extension("postgres")
connection.load_extension("postgres")

connection.execute(f"ATTACH 'dbname=hndata user={POSTGRES_USER} host=db password={POSTGRES_PASSWORD}' AS postgres (TYPE POSTGRES);")
logging.info("Copying table stories from postgres...")
connection.execute("create table stories as from postgres.public.stories")
logging.info("Creating FTS index on table: stories...")
connection.execute("pragma create_fts_index(stories, objectid, title, stemmer = 'none', lower=1, ignore='(\\.|[^a-z#+])+', overwrite=1)")
logging.info("Copying table hiring_comments from postgres...")
connection.execute("create table hiring_comments as from postgres.public.hiring_comments")
logging.info("Creating FTS index on table: hiring_comments...")
connection.execute("pragma create_fts_index(hiring_comments, objectid, comment_text, stemmer = 'none', lower=1, ignore='(\\.|[^a-z#+])+', overwrite=1)")


connection.execute("""create table if not exists keywords (
  word text,
  objectid text,
  submission_date text,
  title text,
  year_month text,
  primary key (word, objectid));""")
connection.execute("""create table if not exists hiring_keywords (
  word text,
  objectid text,
  year_month text,
  primary key (word, objectid));""")
WORD_DATA = connection.execute("select keyword from postgres.public.keyword_list;").fetchall()
for word in itertools.chain.from_iterable(WORD_DATA):
    logging.info("Executing FTS for keyword %s", word)
    connection.execute(SQL_STATEMENT_SUBMISSIONS.format(word, word))
    connection.execute(SQL_STATEMENT_HIRING.format(word, word))
try:
    connection.begin()
    connection.execute("delete from postgres.public.keywords; insert into postgres.public.keywords select * from keywords")
    connection.execute("delete from postgres.public.hiring_keywords; insert into postgres.public.hiring_keywords select * from hiring_keywords;")
    connection.commit()
except Exception as e:
    connection.rollback()
    logging.error(f"Failed to insert data into postgres tables: {e}")


