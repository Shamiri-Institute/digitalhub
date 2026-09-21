"use server";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import type { ActionResponse } from "#/types/actions.types";
import type { UserSearchResult } from "#/types/user-search.types";

const RESULT_LIMIT = 20;

export async function fetchAdminUsers(
  search?: string,
): Promise<ActionResponse<UserSearchResult[]>> {
  try {
    const { implementerId, identifier } = await requireAuthRole(ImplementerRole.ADMIN);

    const term = search?.trim();

    const memberships = await db.query.implementerMember.findMany({
      where: (m, { and, eq }) =>
        and(eq(m.role, ImplementerRole.ADMIN), eq(m.implementerId, implementerId)),
      columns: { identifier: true, userId: true },
    });

    const identifierToUserId = new Map(
      memberships
        .filter((m) => m.identifier)
        .map((m) => [m.identifier as string, m.userId] as const),
    );

    if (identifierToUserId.size === 0) {
      return { success: true, message: "Admin users fetched", data: [] };
    }

    const adminUsers = await db.query.adminUser.findMany({
      where: (a, { and, inArray, ne, or, ilike }) =>
        and(
          inArray(a.id, Array.from(identifierToUserId.keys())),
          identifier ? ne(a.id, identifier) : undefined,
          term ? or(ilike(a.adminName, `%${term}%`), ilike(a.email, `%${term}%`)) : undefined,
        ),
      orderBy: (a, { asc }) => asc(a.adminName),
      limit: RESULT_LIMIT,
    });

    const results: UserSearchResult[] = adminUsers
      .map((admin) => ({
        id: admin.id,
        userId: identifierToUserId.get(admin.id) ?? null,
        name: admin.adminName,
        email: admin.email,
      }))
      .filter((admin) => admin.userId !== null);

    return { success: true, message: "Admin users fetched", data: results };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
