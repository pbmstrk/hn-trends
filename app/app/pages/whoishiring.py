from sqlalchemy import create_engine
import dash
import pandas as pd
from dash import dcc, callback, Input, Output, no_update
from dash import html
import dash_mantine_components as dmc
import plotly.express as px

from pages.common.db import fetch_database_url, execute_query
from pages.common.ui import create_logo_dropdown


dash.register_page(__name__, title="Hiring trends")

SQL_QUERY_KEYWORD_HIRING_OCCURENCES = """
    select word, year_month, count(objectID) as num_occurences
    from hiring_keywords
    where word in :wordlist
    group by year_month, word
    order by year_month
"""


TEXT_WHOISHIRING_POSTS = """
#### Number of comments

The number of comments on the monthly *Ask HN: Who is hiring?* thread. Use the checkbox
to toggle between displaying the count of only the top-level comments or the total 
number.
"""

TEXT_WHOISHIRING_TRENDS = """
#### Trends

Use the dropdown to display the number of comments that include the selected keywords.
"""


database_url = fetch_database_url()
engine = create_engine(database_url, pool_pre_ping=True, pool_recycle=3600)

keyword_df = execute_query(engine, "select * from keyword_list where include_hiring;")

KEYWORDS = keyword_df["keyword"].tolist()
WORD2DISPLAY = {t.keyword: t.display_name for t in keyword_df.itertuples()}
DISPLAY2WORD = {v: k for k, v in WORD2DISPLAY.items()}


layout = html.Div(
    children=[
        dcc.Markdown(TEXT_WHOISHIRING_POSTS),
        dmc.Checkbox(
            id="top-level-only", label="Include only top-level comments.", checked=True
        ),
        dcc.Graph(id="number-comments"),
        dcc.Markdown(TEXT_WHOISHIRING_TRENDS),
        dcc.Dropdown(
            create_logo_dropdown(
                WORD2DISPLAY.keys(), WORD2DISPLAY.values(), "tech_logos"
            ),
            multi=True,
            id="hiring-keyword-dropdown",
            value=["python"],
            optionHeight=40,
            persistence=True,
            persistence_type="memory",
        ),
        dcc.Graph(id="hiring-keywords"),
    ]
)


@callback(Output("number-comments", "figure"), Input("top-level-only", "checked"))
def exclude_blog_checkbox(checked):
    """Updates line graph with the number of articles per month, based on whether
    the "exclude-blog" checkbox is checked."""

    # filter the DataFrame based on the checkbox value
    if checked:
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
    dff = execute_query(engine, query)

    fig = px.line(
        dff,
        x="year_month",
        y="num_comments",
        title="Number of comments",
        labels={"year_month": "Month", "num_comments": "Number of comments"}
    )

    fig.update_traces(
        hovertemplate="<br>".join(["Month: %{x|%B %Y}", "Number of comments: %{y}"]),
        line={"width": 2.5, "color": "#1B4D3E"},
    )

    fig.update_layout(margin={"l": 60, "r": 60, "t": 60, "b": 60}, hovermode="x")
    fig.update_yaxes(rangemode="tozero")
    return fig


@callback(
    Output("hiring-keywords", "figure"), Input("hiring-keyword-dropdown", "value")
)
def update_keyword_figure(value):
    if not value:
        return no_update

    result_df = execute_query(
        engine, SQL_QUERY_KEYWORD_HIRING_OCCURENCES, wordlist=tuple(value)
    )

    full_date_range = pd.date_range(
        start=result_df["year_month"].min(),
        end=result_df["year_month"].max(),
        freq="MS",
    ).strftime("%Y-%m")

    dff = (
        result_df.set_index("year_month")
        .groupby("word")
        .apply(
            lambda g: (
                g.reindex(full_date_range, fill_value=0).rename_axis("year_month")
            )
        )
    )[["num_occurences"]].reset_index()

    dff["word"] = dff["word"].map(WORD2DISPLAY)
    display_words = [WORD2DISPLAY[val] for val in value]
    fig = px.line(
        dff,
        x="year_month",
        y="num_occurences",
        color="word",
        markers=True,
        line_shape="spline",
        category_orders={"word": display_words},
        labels={
            "word": "Keyword",
            "num_occurences": "No. occurences",
            "year_month": "Month",
        },
    )
    fig.update_traces(hovertemplate="No. occurences: %{y}")
    fig.update_layout(hovermode="x")
    fig.update_yaxes(rangemode="tozero")
    return fig
