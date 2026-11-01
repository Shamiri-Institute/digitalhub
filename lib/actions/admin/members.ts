import type { Transaction } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { implementerMember, user } from "#/db/schema";
import { AdminActionError } from "./action-error";

/**
 * Gives the person with `email` a membership of `implementerId` in `role`, creating their user
 * when they have none. `email` is lowercase. Throws when their user has been archived.
 */
export async function addImplementerMember(
  tx: Transaction,
  member: {
    implementerId: string;
    email: string;
    name: string;
    role: ImplementerRole;
    identifier: string;
  },
) {
  const existingUser = await tx.query.user.findFirst({
    where: (u, { sql }) => sql`lower(${u.email}) = ${member.email}`,
    columns: { id: true, archivedAt: true },
    with: { memberships: { columns: { id: true }, limit: 1 } },
  });
  if (existingUser?.archivedAt) {
    throw new AdminActionError("This user has been archived");
  }

  let userId = existingUser?.id;
  if (!userId) {
    const [createdUser] = await tx
      .insert(user)
      .values({ email: member.email, name: member.name })
      .returning({ id: user.id });
    if (!createdUser) {
      throw new Error("Could not create the member's user");
    }
    userId = createdUser.id;
  }

  // The most recently updated membership is the active one, so a person who already has one keeps
  // it active: the new membership gets no updatedAt.
  const hasOtherMembership = (existingUser?.memberships.length ?? 0) > 0;
  await tx.insert(implementerMember).values({
    implementerId: member.implementerId,
    userId,
    role: member.role,
    identifier: member.identifier,
    ...(hasOtherMembership ? { updatedAt: null } : {}),
  });
}
