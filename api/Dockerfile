FROM python:3.12-slim 

WORKDIR /hn-data 

COPY app/ app/ 

RUN pip install --no-cache-dir --upgrade -r app/requirements.txt 

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
