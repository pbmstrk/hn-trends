import plotly.express as px


def create_submissions_figure(data):
    fig = px.line(
        data,
        x="submission_date",
        y="moving_avg",
        title="Number of submissions on HN (seven day moving average)",
        labels={
            "submission_date": "Day",
            "moving_avg": "No. submissions (moving average)",
        },
    )
    fig.update_layout(
        margin={"l": 60, "r": 60, "t": 60, "b": 60},
        hovermode="x",
        xaxis_tickformat="%d %b %Y",
    )
    fig.update_traces(
        hovertemplate="No. submissions (avg): %{y}", line={"color": "#ff6600"}
    )
    fig.update_yaxes(rangemode="tozero")
    return fig
