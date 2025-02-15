FROM postgres:16

RUN apt update &&  \ 
  apt -y install postgresql-16-cron vim && \ 
  apt clean

COPY words.csv /
COPY setup.sql /docker-entrypoint-initdb.d/init.sql

