#!/bin/bash

# REPLACE hostname, username, database_name and outputfile.sql with the relevant params

pg_dump -h <hostname> -U <username> -d <database_name> -f <outpufile.sql>
