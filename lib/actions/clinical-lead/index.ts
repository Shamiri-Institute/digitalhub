"use server";

import { ImplementerRole, Prisma } from "@prisma/client";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { db } from "#/lib/db";
import type { ActionResponse } from "#/types/actions.types";
import type { UserSearchResult } from "#/types/user-search.types";
import { FetchClinicalLeadsSchema } from "./types";

const RESULT_LIMIT = 20;

export async function fetchClinicalLeads(
  hubId: string,
  search?: string,
): Promise<ActionResponse<UserSearchResult[]>> {
  try {
    const { implementerId, identifier } = await requireAuthRole(ImplementerRole.CLINICAL_LEAD);

    const validatedData = FetchClinicalLeadsSchema.parse({ hubId });
    const term = search?.trim();

    const actorInHub = await db.clinicalLead.findFirst({
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
        message: "You can only search clinical leads in your own hub",
      };
    }

    const clinicalLeads = await db.clinicalLead.findMany({
      where: {
        assignedHubId: validatedData.hubId,
        implementerId,
        ...(identifier ? { id: { not: identifier } } : {}),
        ...(term
          ? {
              OR: [
                {
                  clinicalLeadName: {
                    contains: term,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  clinicalLeadEmail: {
                    contains: term,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { clinicalLeadName: "asc" },
      take: RESULT_LIMIT,
    });

    const clinicalLeadIds = clinicalLeads.map((cl) => cl.id);

    const implementerMembers = await db.implementerMember.findMany({
      where: {
        role: ImplementerRole.CLINICAL_LEAD,
        implementerId,
        identifier: { in: clinicalLeadIds },
      },
      select: {
        identifier: true,
        userId: true,
      },
    });

    const memberMap = new Map(
      implementerMembers.map((member) => [member.identifier, member.userId]),
    );

    const results: UserSearchResult[] = clinicalLeads
      .map((cl) => ({
        id: cl.id,
        userId: memberMap.get(cl.id) || null,
        name: cl.clinicalLeadName,
        email: cl.clinicalLeadEmail,
      }))
      .filter((cl) => cl.userId !== null);

    return { success: true, message: "Clinical leads fetched", data: results };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
