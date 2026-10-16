"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import type { z } from "zod";

import { db, isUniqueViolation } from "#/db/client";
import { adminUser, implementerMember, user } from "#/db/schema";
import { requireSuperAdmin } from "#/lib/auth/admin-access";
import { ForbiddenRoleError } from "#/lib/auth/require-auth-role";
import type { ActionResponse } from "#/types/actions.types";
import { actionFailure, AdminActionError } from "./action-error";
import { CreateAdminSchema, UpdateAdminAccessSchema } from "./access-schemas";

export async function createAdmin(
  data: z.infer<typeof CreateAdminSchema>,
): Promise<ActionResponse> {
  try {
    const { implementerId } = await requireSuperAdmin();
    const parsed = CreateAdminSchema.parse(data);

    await db.transaction(async (tx) => {
      const existingAdmin = await tx.query.adminUser.findFirst({
        where: (a, { and, eq, sql }) =>
          and(eq(a.implementerId, implementerId), sql`lower(trim(${a.email})) = ${parsed.email}`),
        columns: { id: true },
      });
      if (existingAdmin) {
        throw new AdminActionError("An admin with this email already exists");
      }

      const existingUser = await tx.query.user.findFirst({
        where: (u, { sql }) => sql`lower(${u.email}) = ${parsed.email}`,
        columns: { id: true, archivedAt: true },
        with: { memberships: { columns: { id: true }, limit: 1 } },
      });
      if (existingUser?.archivedAt) {
        throw new AdminActionError("This user has been archived");
      }

      const [createdAdmin] = await tx
        .insert(adminUser)
        .values({
          email: parsed.email,
          adminName: parsed.adminName,
          implementerId,
          isSuperAdmin: parsed.isSuperAdmin,
          team: parsed.team,
        })
        .returning({ id: adminUser.id });
      if (!createdAdmin) {
        throw new Error("Could not create the new admin user");
      }

      let userId = existingUser?.id;
      if (!userId) {
        const [createdUser] = await tx
          .insert(user)
          .values({ email: parsed.email, name: parsed.adminName })
          .returning({ id: user.id });
        if (!createdUser) {
          throw new Error("Could not create the admin's user");
        }
        userId = createdUser.id;
      }

      // The most recently updated membership is the active one, so a person who already belongs
      // to another implementer keeps it active: the new membership gets no updatedAt.
      const hasOtherMembership = (existingUser?.memberships.length ?? 0) > 0;
      await tx.insert(implementerMember).values({
        implementerId,
        userId,
        role: "ADMIN",
        identifier: createdAdmin.id,
        ...(hasOtherMembership ? { updatedAt: null } : {}),
      });
    });

    refresh();
    return { success: true, message: `Successfully added ${parsed.adminName}` };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { success: false, message: "An admin with this email already exists" };
    }
    return actionFailure(error, "Sorry, could not add the admin.");
  }
}

export async function updateAdminAccess(
  data: z.infer<typeof UpdateAdminAccessSchema>,
): Promise<ActionResponse> {
  try {
    const { implementerId, identifier } = await requireSuperAdmin();
    const parsed = UpdateAdminAccessSchema.parse(data);

    await db.transaction(async (tx) => {
      // Lock the implementer's super admins, then check the caller is still one. A super admin
      // cannot demote themselves, so the implementer always keeps at least one, even when two of
      // them demote each other at the same moment.
      const superAdmins = await tx
        .select({ id: adminUser.id })
        .from(adminUser)
        .where(and(eq(adminUser.implementerId, implementerId), eq(adminUser.isSuperAdmin, true)))
        .for("update");

      if (!superAdmins.some((a) => a.id === identifier)) {
        throw new ForbiddenRoleError("Forbidden: this action requires a super admin");
      }

      const isDemotion = !parsed.isSuperAdmin;
      if (isDemotion && parsed.adminId === identifier) {
        throw new AdminActionError(
          "You cannot remove your own super admin access. Ask another super admin to do it.",
        );
      }

      const updated = await tx
        .update(adminUser)
        .set({ isSuperAdmin: parsed.isSuperAdmin, team: parsed.team })
        .where(and(eq(adminUser.id, parsed.adminId), eq(adminUser.implementerId, implementerId)))
        .returning({ id: adminUser.id });
      if (updated.length === 0) {
        throw new AdminActionError("Admin not found");
      }
    });

    refresh();
    return { success: true, message: "Access updated" };
  } catch (error) {
    return actionFailure(error, "Sorry, could not update the admin's access.");
  }
}
