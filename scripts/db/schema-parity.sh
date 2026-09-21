#!/usr/bin/env bash
# Proves the Drizzle migrations build the same database as the Prisma migrations did.
# Builds two scratch databases next to DATABASE_URL's database, one from the archived Prisma
# migrations and one from drizzle/ via drizzle-kit migrate, and diffs their normalized pg_dump.
#
#   npm run db:parity
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
# psql rejects Prisma-only URI parameters such as ?pool_timeout=30, so drop the query string.
admin_url="${DATABASE_URL%%\?*}"
base="${admin_url%/*}"
prisma_db="$base/parity_prisma"
drizzle_db="$base/parity_drizzle"

for name in parity_prisma parity_drizzle; do
  psql "$admin_url" -qc "drop database if exists $name"
  psql "$admin_url" -qc "create database $name"
done

echo "archived prisma migrations → parity_prisma"
for f in db/legacy-prisma-migrations/*/migration.sql; do
  psql "$prisma_db" -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null
done
echo "drizzle-kit migrate → parity_drizzle"
DATABASE_URL="$drizzle_db" npx drizzle-kit migrate >/dev/null

# Normalization, each rule is a cosmetic difference between the two tools:
# - Prisma writes CURRENT_TIMESTAMP where Drizzle writes now(); Postgres stores the same default.
# - Postgres 18 names NOT NULL constraints; Prisma's carry names from renamed columns, Drizzle's are defaults.
# - Columns that foreign keys reference are UNIQUE constraints in Drizzle (push/migrate create FKs before
#   indexes) and unique indexes in Prisma; Postgres backs both with the same unique index.
# - Lines are sorted, so statement order does not matter and the diff is a line-multiset comparison.
dump() {
  pg_dump --schema-only --no-owner --no-privileges --no-comments --exclude-schema=drizzle "$1" |
    perl -0pe 's/ALTER TABLE ONLY (\S+)\n\s+ADD CONSTRAINT (\S+) UNIQUE \(([^)]+)\);/CREATE UNIQUE INDEX $2 ON $1 USING btree ($3);/g' |
    sed -E -e '/^--/d' -e '/^$/d' -e '/^SET /d' -e '/^SELECT pg_catalog.set_config/d' -e '/^\\(un)?restrict/d' \
      -e 's/CURRENT_TIMESTAMP/now\(\)/g' -e 's/ CONSTRAINT [a-z0-9_]+_not_null NOT NULL/ NOT NULL/' |
    sort
}

if diff <(dump "$prisma_db") <(dump "$drizzle_db"); then
  echo "schema parity: OK"
else
  echo "schema parity: db/schema.ts differs from prisma/migrations (see diff above)" >&2
  exit 1
fi
