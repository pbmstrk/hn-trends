FROM python:3.12-slim 

WORKDIR /run 

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade -r requirements.txt 

COPY refresh.py .

RUN mkdir data

CMD ["python", "refresh.py"]
