import dash
import dash_bootstrap_components as dbc
from dash import Dash, html, Input, Output, dcc
from dash_bootstrap_templates import load_figure_template

load_figure_template("flatly")

app = Dash(
    __name__,
    external_stylesheets=[dbc.themes.FLATLY, dbc.icons.FONT_AWESOME],
    use_pages=True,
)

app.title = "Hacker News Trends"
server = app.server

LINKS = {
    d["path"]: d["supplied_title"] for d in dash.page_registry.values()
}


navbar = dbc.NavbarSimple(
    brand="Hacker News Trends",
    brand_style={"fontSize": "2rem"},
    color="#FD9752",
    class_name="title",
    id="navbar",
)

app.layout = html.Div(
    children=[
        dcc.Location(id="url"),
        navbar,
        dbc.Container(dash.page_container, class_name="content"),
    ]
)


@app.callback(Output("navbar", "children"), Input("url", "pathname"))
def update_navbar(pathname):
    """Update navbar based on the current page pathname."""
    children = [
        dbc.NavItem(dbc.NavLink(title, href=link, active=(pathname == link)))
        for link, title in LINKS.items()
        
    ]
    return children


if __name__ == "__main__":
    app.run_server(host="0.0.0.0", port="8050", debug=True)
