"use server";

import { getCachedSession } from "#/lib/auth-options";
import { db } from "#/lib/db";

// The session callback treats the most recently updated membership as the active one.
export async function setActiveMembership(membershipId: number): Promise<void> {
  const userId = (await getCachedSession())?.user.id;
  if (!userId) {
    throw new Error("The session has not been authenticated");
  }
  await db.implementerMember.update({
    where: { id: membershipId, userId },
    data: { updatedAt: new Date() },
  });
}
