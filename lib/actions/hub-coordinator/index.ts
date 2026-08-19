"use server";

import { ImplementerRole, Prisma } from "@prisma/client";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { db } from "#/lib/db";
import type { ActionResponse } from "#/types/actions.types";
import type { UserSearchResult } from "#/types/user-search.types";
import { FetchHubCoordinatorsSchema } from "./types";

const RESULT_LIMIT = 20;

export async function fetchHubCoordinators(
  hubId: string,
  search?: string,
): Promise<ActionResponse<UserSearchResult[]>> {
  try {
    const { implementerId, identifier } = await requireAuthRole(
      ImplementerRole.HUB_COORDINATOR,
    );

    const validatedData = FetchHubCoordinatorsSchema.parse({ hubId });
    const term = search?.trim();

    const actorInHub = await db.hubCoordinator.findFirst({
      where: {
        id: identifier ?? "",
        assignedHubId: validatedData.hubId,
        implementerId,
      },
      select: { id: true },
    });

    if (!actorInHub) {
      return {
        success: false,
        message: "You can only search coordinators in your own hub",
      };
    }

    const hubCoordinators = await db.hubCoordinator.findMany({
      where: {
        assignedHubId: validatedData.hubId,
        implementerId,
        archivedAt: null,
        ...(identifier ? { id: { not: identifier } } : {}),
        ...(term
          ? {
              OR: [
                {
                  coordinatorName: {
                    contains: term,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  coordinatorEmail: {
                    contains: term,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  visibleId: {
                    contains: term,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { coordinatorName: "asc" },
      take: RESULT_LIMIT,
    });

    const hubCoordinatorIds = hubCoordinators.map((hc) => hc.id);

    const implementerMembers = await db.implementerMember.findMany({
      where: {
        role: ImplementerRole.HUB_COORDINATOR,
        implementerId,
        identifier: { in: hubCoordinatorIds },
      },
      select: {
        identifier: true,
        userId: true,
      },
    });

    const memberMap = new Map(
      implementerMembers.map((member) => [member.identifier, member.userId]),
    );

    const results: UserSearchResult[] = hubCoordinators
      .map((hc) => ({
        id: hc.id,
        userId: memberMap.get(hc.id) || null,
        name: hc.coordinatorName,
        email: hc.coordinatorEmail,
        visibleId: hc.visibleId,
      }))
      .filter((hc) => hc.userId !== null);

    return {
      success: true,
      message: "Hub coordinators fetched",
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
