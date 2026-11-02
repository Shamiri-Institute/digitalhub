"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import type { z } from "zod";

import { db, isUniqueViolation } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { adminUser } from "#/db/schema";
import { requireSuperAdmin } from "#/lib/auth/admin-access";
import { ForbiddenRoleError } from "#/lib/auth/require-auth-role";
import type { ActionResponse } from "#/types/actions.types";
import { actionFailure, AdminActionError } from "./action-error";
import { CreateAdminSchema, UpdateAdminAccessSchema } from "./access-schemas";
import { addImplementerMember } from "./members";

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

      await addImplementerMember(tx, {
        implementerId,
        email: parsed.email,
        name: parsed.adminName,
        role: ImplementerRole.ADMIN,
        identifier: createdAdmin.id,
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
