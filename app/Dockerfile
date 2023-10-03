FROM python:3.11-slim

WORKDIR /hn-trends

COPY ./requirements.txt /hn-trends/

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY app/ /hn-trends/app/

EXPOSE 8050

ENV PYTHONPATH /hn-trends/app/

CMD ["gunicorn", "-b", "0.0.0.0:8050", "app.app:server"]