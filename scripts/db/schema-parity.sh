#!/usr/bin/env bash
# Proves db/schema.ts describes the same database as prisma/migrations.
# Builds two scratch databases next to DATABASE_URL's database, one from the Prisma
# migrations and one from the Drizzle schema, and diffs their normalized pg_dump output.
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

echo "prisma migrate deploy → parity_prisma"
DATABASE_URL="$prisma_db" npx prisma migrate deploy >/dev/null
echo "drizzle-kit push → parity_drizzle"
# drizzle-kit push exits 0 even when a statement fails, so look for the error text.
push_log="$(DATABASE_URL="$drizzle_db" npx drizzle-kit push --force 2>&1)"
if grep -qE '^error' <<<"$push_log"; then
  grep -E -A3 '^error' <<<"$push_log" >&2
  echo "schema parity: drizzle-kit push failed" >&2
  exit 1
fi

# Normalization, each rule is a cosmetic difference between the two tools:
# - Prisma writes CURRENT_TIMESTAMP where Drizzle writes now(); Postgres stores the same default.
# - Postgres 18 names NOT NULL constraints; Prisma's carry names from renamed columns, Drizzle's are defaults.
# - Columns that foreign keys reference are UNIQUE constraints in Drizzle (push/migrate create FKs before
#   indexes) and unique indexes in Prisma; Postgres backs both with the same unique index.
# - Lines are sorted, so statement order does not matter and the diff is a line-multiset comparison.
dump() {
  pg_dump --schema-only --no-owner --no-privileges --no-comments \
    --exclude-schema=drizzle --exclude-table=_prisma_migrations "$1" |
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
