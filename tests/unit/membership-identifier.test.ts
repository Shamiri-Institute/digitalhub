// @vitest-environment node
import { and, eq, sql, TransactionRollbackError } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool, type Transaction } from "#/db/client";
import { fellow, implementerMember, opsUser } from "#/db/schema";

afterAll(() => pool.end());

// The checks are deferred to commit, so this forces them with SET CONSTRAINTS and then rolls back.
// It returns the error a commit would raise, or null.
async function commitError(write: (tx: Transaction) => Promise<unknown>) {
  try {
    await db.transaction(async (tx) => {
      await write(tx);
      await tx.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`);
      tx.rollback();
    });
  } catch (error) {
    if (error instanceof TransactionRollbackError) return null;
    return error instanceof Error && error.cause instanceof Error ? error.cause.message : error;
  }
  return null;
}

async function memberOfRole(role: "FELLOW" | "OPERATIONS") {
  const membership = await db.query.implementerMember.findFirst({
    where: (m, { and, eq, isNotNull }) => and(eq(m.role, role), isNotNull(m.identifier)),
    orderBy: (m, { asc }) => asc(m.id),
  });
  if (!membership?.identifier) throw new Error(`The seed has no ${role} membership`);
  return { ...membership, identifier: membership.identifier };
}

describe("implementer_members.identifier", () => {
  it("points at a profile of the membership's role for every seeded membership", async () => {
    const result = await db.execute<{ count: number }>(sql`
      select count(*)::int as count from implementer_members m
      where m.identifier is not null and not case m.role
        when 'ADMIN' then exists (select 1 from admin_users p where p.id = m.identifier)
        when 'HUB_COORDINATOR' then exists (select 1 from hub_coordinators p where p.id = m.identifier)
        when 'SUPERVISOR' then exists (select 1 from supervisors p where p.id = m.identifier)
        when 'FELLOW' then exists (select 1 from fellows p where p.id = m.identifier)
        when 'CLINICAL_LEAD' then exists (select 1 from clinical_leads p where p.id = m.identifier)
        when 'CLINICAL_TEAM' then exists (select 1 from clinical_teams p where p.id = m.identifier)
        when 'OPERATIONS' then exists (select 1 from ops_users p where p.id = m.identifier)
      end`);
    expect(result.rows[0]?.count).toBe(0);
  });

  it("rejects a membership whose identifier has no profile", async () => {
    const member = await memberOfRole("FELLOW");
    const error = await commitError((tx) =>
      tx.insert(implementerMember).values({
        implementerId: member.implementerId,
        userId: member.userId,
        role: "FELLOW",
        identifier: "fellow_doesnotexist",
      }),
    );
    expect(error).toMatch(/points at FELLOW fellow_doesnotexist, which does not exist/);
  });

  it("rejects a role change that leaves the identifier in the wrong table", async () => {
    const member = await memberOfRole("FELLOW");
    const error = await commitError((tx) =>
      tx
        .update(implementerMember)
        .set({ role: "SUPERVISOR" })
        .where(eq(implementerMember.id, member.id)),
    );
    expect(error).toMatch(/which does not exist/);
  });

  it("rejects renaming a profile that a membership points at", async () => {
    const member = await memberOfRole("FELLOW");
    const error = await commitError((tx) =>
      tx.update(fellow).set({ id: "fellow_renamed" }).where(eq(fellow.id, member.identifier)),
    );
    expect(error).toMatch(/is the identifier of a FELLOW membership/);
  });

  it("rejects deleting a profile that a membership points at", async () => {
    const member = await memberOfRole("OPERATIONS");
    const error = await commitError((tx) =>
      tx.delete(opsUser).where(eq(opsUser.id, member.identifier)),
    );
    expect(error).toMatch(/is the identifier of a OPERATIONS membership/);
  });

  it("accepts renaming a profile together with its memberships", async () => {
    const member = await memberOfRole("FELLOW");
    const error = await commitError(async (tx) => {
      await tx.update(fellow).set({ id: "fellow_renamed" }).where(eq(fellow.id, member.identifier));
      await tx
        .update(implementerMember)
        .set({ identifier: "fellow_renamed" })
        .where(
          and(
            eq(implementerMember.role, "FELLOW"),
            eq(implementerMember.identifier, member.identifier),
          ),
        );
    });
    expect(error).toBeNull();
  });
});
