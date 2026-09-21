"use server";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import type { ActionResponse } from "#/types/actions.types";
import type { UserSearchResult } from "#/types/user-search.types";
import { FetchHubCoordinatorsSchema } from "./types";

const RESULT_LIMIT = 20;

export async function fetchHubCoordinators(
  hubId: string,
  search?: string,
): Promise<ActionResponse<UserSearchResult[]>> {
  try {
    const { implementerId, identifier } = await requireAuthRole(ImplementerRole.HUB_COORDINATOR);

    const validatedData = FetchHubCoordinatorsSchema.parse({ hubId });
    const term = search?.trim();

    const actorInHub = await db.query.hubCoordinator.findFirst({
      where: (hc, { and, eq }) =>
        and(
          eq(hc.id, identifier ?? ""),
          eq(hc.assignedHubId, validatedData.hubId),
          eq(hc.implementerId, implementerId),
        ),
      columns: { id: true },
    });

    if (!actorInHub) {
      return {
        success: false,
        message: "You can only search coordinators in your own hub",
      };
    }

    const hubCoordinators = await db.query.hubCoordinator.findMany({
      where: (hc, { and, eq, ne, ilike, isNull, or }) =>
        and(
          eq(hc.assignedHubId, validatedData.hubId),
          eq(hc.implementerId, implementerId),
          isNull(hc.archivedAt),
          identifier ? ne(hc.id, identifier) : undefined,
          term
            ? or(
                ilike(hc.coordinatorName, `%${term}%`),
                ilike(hc.coordinatorEmail, `%${term}%`),
                ilike(hc.visibleId, `%${term}%`),
              )
            : undefined,
        ),
      orderBy: (hc, { asc }) => asc(hc.coordinatorName),
      limit: RESULT_LIMIT,
    });

    const hubCoordinatorIds = hubCoordinators.map((hc) => hc.id);

    const implementerMembers = await db.query.implementerMember.findMany({
      where: (m, { and, eq, inArray }) =>
        and(
          eq(m.role, ImplementerRole.HUB_COORDINATOR),
          eq(m.implementerId, implementerId),
          inArray(m.identifier, hubCoordinatorIds),
        ),
      columns: { identifier: true, userId: true },
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
