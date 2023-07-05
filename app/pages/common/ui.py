from dash import html


def create_logo_dropdown(values, display_names, directory):
    dropdowns = []
    image_dir = f"/assets/images/{directory}"
    display_name_style = {"fontSize": 15, "paddingLeft": 10}
    for value, display_name in zip(values, display_names):
        dropdowns.append(
            {
                "label": html.Span(
                    [
                        html.Img(
                            src=f"{image_dir}/{value.replace('#', 'sharp')}.svg",
                            width=20,
                        ),
                        html.Span(display_name, style=display_name_style),
                    ]
                ),
                "value": value,
            }
        )
    return dropdowns
