drop table if exists keywords;

create table if not exists keywords as (
    select * from read_csv_auto('words.csv', header=true)
)