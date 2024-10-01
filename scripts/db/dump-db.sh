#!/bin/bash
# REPLACE hostname, username, database_name  with the relevant params

# command for creating the dump
pg_dump -h "${PROD_DBHOST}" -U "${PROD_DBUSER}" -d "${PROD_DBNAME}" -f db-dump.sql

# command for loading your local db/docker db with contents from the dump
# you can also add flags for your user/port/host if required. Please refer to the psql command documentation
psql -d shamiri_db -f db-dump.sql
