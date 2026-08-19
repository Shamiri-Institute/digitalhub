"use server";

import { ImplementerRole, Prisma } from "@prisma/client";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { db } from "#/lib/db";
import type { ActionResponse } from "#/types/actions.types";
import type { UserSearchResult } from "#/types/user-search.types";

const RESULT_LIMIT = 20;

export async function fetchAdminUsers(
  search?: string,
): Promise<ActionResponse<UserSearchResult[]>> {
  try {
    const { implementerId, identifier } = await requireAuthRole(ImplementerRole.ADMIN);

    const term = search?.trim();

    const memberships = await db.implementerMember.findMany({
      where: { role: ImplementerRole.ADMIN, implementerId },
      select: { identifier: true, userId: true },
    });

    const identifierToUserId = new Map(
      memberships
        .filter((m) => m.identifier)
        .map((m) => [m.identifier as string, m.userId] as const),
    );

    if (identifierToUserId.size === 0) {
      return { success: true, message: "Admin users fetched", data: [] };
    }

    const adminUsers = await db.adminUser.findMany({
      where: {
        id: {
          in: Array.from(identifierToUserId.keys()),
          ...(identifier ? { not: identifier } : {}),
        },
        ...(term
          ? {
              OR: [
                {
                  adminName: {
                    contains: term,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  email: { contains: term, mode: Prisma.QueryMode.insensitive },
                },
              ],
            }
          : {}),
      },
      orderBy: { adminName: "asc" },
      take: RESULT_LIMIT,
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
