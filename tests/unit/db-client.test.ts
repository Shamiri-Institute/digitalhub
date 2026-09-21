// @vitest-environment node
import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool, queryRaw } from "#/db/client";
import { user } from "#/db/schema";

afterAll(() => pool.end());

describe("db client", () => {
  it("reads raw int8, timestamp and date the way Prisma did", async () => {
    const [row] = await queryRaw<{ n: number; t: Date; d: Date }>(
      sql`select 1::int8 as n, '2024-01-02 03:04:05.678'::timestamp as t, '2024-01-02'::date as d`,
    );
    expect(row).toEqual({
      n: 1,
      t: new Date("2024-01-02T03:04:05.678Z"),
      d: new Date("2024-01-02T00:00:00.000Z"),
    });
  });

  it("fills id, createdAt and updatedAt on insert and bumps updatedAt on update", async () => {
    await db
      .transaction(async (tx) => {
        const [created] = await tx
          .insert(user)
          .values({ email: `db-client-test-${Date.now()}@example.com` })
          .returning();
        if (!created) throw new Error("insert returned no row");
        expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(created.createdAt).toBeInstanceOf(Date);
        expect(created.updatedAt).toBeInstanceOf(Date);

        await new Promise((resolve) => setTimeout(resolve, 5));
        const [updated] = await tx
          .update(user)
          .set({ name: "db client test" })
          .where(eq(user.id, created.id))
          .returning();
        if (!updated) throw new Error("update returned no row");
        expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());

        tx.rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof TransactionRollbackError)) throw error;
      });
  });
});
