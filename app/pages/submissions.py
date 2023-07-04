import dash
from dash import (
    html,
    dcc,
    callback,
    Input,
    Output,
    no_update,
    exceptions,
    dash_table,
    State,
)
import plotly.express as px
import pandas as pd
from sqlalchemy import create_engine

from pages.common.db import fetch_database_url, execute_query
from pages.common.ui import create_logo_dropdown
from pages.common.graphs import create_submissions_figure


dash.register_page(__name__, path="/", title="Submissions")

# SQL QUERIES
SQL_QUERY_SUBMISSIONS = """
    select submission_date, 
    avg(num_submissions) over (order by submission_date 
    range between interval '3' day preceding and 
    interval '3' day following) as moving_avg 
    from submissions_per_day;
"""
SQL_QUERY_KEYWORD_OCCURENCES = """
    select word, year_month, count(title) as num_occurences
    from keywords
    where word in :wordlist
    group by year_month, word
    order by year_month
"""
SQL_QUERY_KEYWORD_TITLES = """
    select title, objectID, submission_date 
    from keywords
    where word = :keyword
    and year_month = :year_month
"""
SQL_QUERY_ENGAGEMENT = """
    select * from engagement where
    submission_year = :year
"""

TEXT_NUMBER_SUBMISSIONS = """
#### Number of submissions"""

TEXT_SUBMISSIONS_TREND = """
#### Trends

Use the dropdown option below to display the trend in frequency of certain keywords in 
the titles of submissions on Hacker News. Clicking on a trace will display a sample
of submissions that contain the selected keyword from the corresponding time period.
"""

database_url = fetch_database_url()
engine = create_engine(database_url, pool_pre_ping=True, pool_recycle=3600)

keyword_df = execute_query(engine, "select * from words;")

KEYWORDS = keyword_df["keyword"].tolist()
WORD2DISPLAY = dict(zip(keyword_df["keyword"], keyword_df["display_name"]))
DISPLAY2WORD = {v: k for k, v in WORD2DISPLAY.items()}

submissions_data = execute_query(engine, SQL_QUERY_SUBMISSIONS)
submissions_figure = create_submissions_figure(submissions_data)


layout = html.Div(
    children=[
        dcc.Markdown(TEXT_NUMBER_SUBMISSIONS),
        dcc.Graph(figure=submissions_figure, id="num-submissions"),
        dcc.Markdown(TEXT_SUBMISSIONS_TREND),
        dcc.Dropdown(
            create_logo_dropdown(
                WORD2DISPLAY.keys(), WORD2DISPLAY.values(), "tech_logos"
            ),
            multi=True,
            id="keyword-dropdown",
            value=["python"],
            optionHeight=40,
            persistence=True,
            persistence_type="memory",
        ),
        dcc.Graph(id="keyword-trends"),
        dash_table.DataTable(
            [],
            id="example-submissions",
            style_header={"backgroundColor": "white", "fontWeight": "bold"},
            style_as_list_view=True,
            style_cell={"textAlign": "left"},
            style_table={"margin-bottom": "20px"},
        ),
    ]
)


@callback(
    Output("example-submissions", "data"),
    Input("keyword-trends", "clickData"),
    State("keyword-trends", "figure"),
)
def update_example_stories(clickData, figure):
    """Updates the table displaying example submissions."""

    if not clickData:
        raise exceptions.PreventUpdate
    curve_number = clickData["points"][0]["curveNumber"]
    keyword = DISPLAY2WORD[figure["data"][curve_number]["name"]]
    x_axis_click = clickData["points"][0]["x"]

    result = execute_query(
        engine, SQL_QUERY_KEYWORD_TITLES, keyword=keyword, year_month=x_axis_click[:-3]
    )
    sample = result.sample(min(5, result.shape[0]))
    sample = sample.rename(columns={
        "title": "Submission Title",
        "objectid": "Object ID",
        "submission_date": "Submission Date"}
    )

    return sample.to_dict("records")


@callback(Output("keyword-trends", "figure"), Input("keyword-dropdown", "value"))
def update_keyword_figure(value):
    """Updates the keyword figure showing the monhtly count of submissions containing
    each keyword. If no value is selected in the dropdown, it returns `dash.no_update`
    to prevent updating the figure."""

    if not value:
        return no_update

    result_df = execute_query(
        engine, SQL_QUERY_KEYWORD_OCCURENCES, wordlist=tuple(value)
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
        line_shape="spline",
        markers=True,
        labels={
            "word": "Keyword",
            "num_occurences": "No. occurences",
            "year_month": "Month",
        },
        category_orders={"word": display_words},
    )

    fig.update_traces(hovertemplate="<br>".join(
        ["Month:  %{x|%B %Y}", "No. submissions: %{y}" ]
    ))
    fig.update_yaxes(rangemode="tozero")

    return fig
