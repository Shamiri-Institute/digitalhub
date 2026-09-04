"use server";

import { getCachedSession } from "#/lib/auth-options";
import { db } from "#/lib/db";

/**
 * The session callback treats the caller's most recently updated membership as active, so
 * switching is a timestamp bump on a row the caller owns. A membership id that is not theirs
 * matches nothing and Prisma throws.
 */
// ponytail: updatedAt doubles as "last activated"; add User.activeMembershipId if that overload bites.
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
