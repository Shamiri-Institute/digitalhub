-- Drops the migrations log left behind by the previous ORM.
--
-- Nothing reads it: drizzle-kit keeps its own log in `drizzle.__drizzle_migrations`, and that log
-- has owned this database since the cutover. The table holds no application data.
--
-- The table name below is the one it was created with, so it has to be spelled out. It does not
-- exist on a database built from the Drizzle baseline, which makes this a no-op there.

DROP TABLE IF EXISTS "_prisma_migrations";
