"use server";

import { and, eq } from "drizzle-orm";

import { db } from "#/db/client";
import { implementerMember } from "#/db/schema";
import { getCachedSession } from "#/lib/auth-options";

// The session callback treats the most recently updated membership as the active one.
export async function setActiveMembership(membershipId: number): Promise<void> {
  const userId = (await getCachedSession())?.user.id;
  if (!userId) {
    throw new Error("The session has not been authenticated");
  }
  const updated = await db
    .update(implementerMember)
    .set({ updatedAt: new Date() })
    .where(and(eq(implementerMember.id, membershipId), eq(implementerMember.userId, userId)))
    .returning({ id: implementerMember.id });
  if (updated.length === 0) {
    throw new Error("Membership not found");
  }
}
