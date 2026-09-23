-- Drops the last trace of Prisma in the database.
--
-- `_prisma_migrations` was Prisma's own record of which migrations it had applied. Nothing reads
-- it: drizzle-kit keeps its own log in `drizzle.__drizzle_migrations`, and that log has owned
-- this database since the cutover. The table holds no application data.
--
-- It does not exist on a database built from the Drizzle baseline, so this is a no-op there.

DROP TABLE IF EXISTS "_prisma_migrations";
