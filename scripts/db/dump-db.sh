#!/bin/bash
set -euxo pipefail

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")

# command for creating the dump
pg_dump -h "${PROD_DBHOST}" -U "${PROD_DBUSER}" -d "${PROD_DBNAME}" -f db-dump-"$TIMESTAMP".sql

# command for loading your local db/docker db with contents from the dump
# you can also add flags for your user/port/host if required. Please refer to the psql command documentation
psql -d shamiri_db -f db-dump-"$TIMESTAMP".sql
