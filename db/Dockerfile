FROM postgres:16

COPY words.csv /
COPY setup.sql /docker-entrypoint-initdb.d/init.sql

