FROM python:3.11-slim

WORKDIR /hn-trends

COPY . ./app/


RUN pip install --upgrade pip
RUN pip install -r app/requirements.txt 

EXPOSE 8050

ENV PYTHONPATH /hn-trends/app

CMD ["gunicorn", "-b", "0.0.0.0:8050", "--reload", "app.app:server"]