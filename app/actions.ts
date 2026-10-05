"use server";

import { and, eq } from "drizzle-orm";

import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { implementerMember } from "#/db/schema";
import { constants } from "#/lib/constants";

export async function selectPersonnel({
  identifier,
  role,
}: {
  identifier: string;
  role: ImplementerRole;
}) {
  // An exported server action is a public endpoint in every build; the UI check is not a gate.
  if (constants.NEXT_PUBLIC_ENV !== "development") {
    throw new Error("Role switching is only available in development");
  }
  if (!Object.values(ImplementerRole).includes(role)) {
    throw new Error("Invalid role");
  }
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const { activeMembership } = session.user;
  if (!activeMembership) {
    return null;
  }
  const updated = await db
    .update(implementerMember)
    .set({ identifier, role })
    .where(
      and(
        eq(implementerMember.id, activeMembership.id),
        eq(implementerMember.userId, session.user.id ?? ""),
      ),
    )
    .returning({ id: implementerMember.id });
  if (updated.length === 0) {
    throw new Error("Membership not found");
  }
  return { success: true };
}
