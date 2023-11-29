#/bin/bash

export PGPASSWORD=${PROD_DBPASS}

psql -h ${PROD_DBHOST} -p ${PROD_DBPORT} -U ${PROD_DBUSER} -d ${PROD_DBNAME} -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${DATABASE_NAME}' AND pid <> pg_backend_pid();"
