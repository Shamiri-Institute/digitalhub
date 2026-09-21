"use server";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
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

    const actorInHub = await db.query.clinicalLead.findFirst({
      where: (cl, { and, eq }) =>
        and(
          eq(cl.id, identifier ?? ""),
          eq(cl.assignedHubId, validatedData.hubId),
          eq(cl.implementerId, implementerId),
        ),
      columns: { id: true },
    });

    if (!actorInHub) {
      return {
        success: false,
        message: "You can only search clinical leads in your own hub",
      };
    }

    const clinicalLeads = await db.query.clinicalLead.findMany({
      where: (cl, { and, eq, ne, or, ilike }) =>
        and(
          eq(cl.assignedHubId, validatedData.hubId),
          eq(cl.implementerId, implementerId),
          identifier ? ne(cl.id, identifier) : undefined,
          term
            ? or(ilike(cl.clinicalLeadName, `%${term}%`), ilike(cl.clinicalLeadEmail, `%${term}%`))
            : undefined,
        ),
      orderBy: (cl, { asc }) => asc(cl.clinicalLeadName),
      limit: RESULT_LIMIT,
    });

    const clinicalLeadIds = clinicalLeads.map((cl) => cl.id);

    const implementerMembers =
      clinicalLeadIds.length === 0
        ? []
        : await db.query.implementerMember.findMany({
            where: (m, { and, eq, inArray }) =>
              and(
                eq(m.role, ImplementerRole.CLINICAL_LEAD),
                eq(m.implementerId, implementerId),
                inArray(m.identifier, clinicalLeadIds),
              ),
            columns: { identifier: true, userId: true },
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
