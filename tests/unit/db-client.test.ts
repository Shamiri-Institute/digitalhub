// @vitest-environment node
import { eq, TransactionRollbackError } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "#/db/client";
import { user } from "#/db/schema";

afterAll(() => pool.end());

describe("db client", () => {
  it("fills id, createdAt and updatedAt on insert and bumps updatedAt on update", async () => {
    await db
      .transaction(async (tx) => {
        const [created] = await tx
          .insert(user)
          .values({ email: `db-client-test-${Date.now()}@example.com` })
          .returning();
        if (!created) throw new Error("insert returned no row");
        expect(created.id).toMatch(/^user_[0-9a-hjkmnp-tv-z]{26}$/);
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
