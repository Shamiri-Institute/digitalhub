"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import type { z } from "zod";

import { db, isUniqueViolation, type Transaction } from "#/db/client";
import { hub, interventionSession, sessionName } from "#/db/schema";
import { countOf } from "#/db/sql";
import { getActiveProjectId } from "#/lib/active-project-id";
import {
  assignSessionCodes,
  isHubSessionCategory,
  type SessionTypeGroup,
} from "#/lib/app-constants/hub-session-types";
import { requireSuperAdmin } from "#/lib/auth/admin-access";
import { objectId } from "#/lib/crypto";
import type { ActionResponse } from "#/types/actions.types";
import { actionFailure, AdminActionError } from "./action-error";
import { CreateHubSchema, UpdateHubSchema } from "./hub-schemas";

const DUPLICATE_NAME_MESSAGE = "A hub with this name already exists in this project";
const INVALID_SESSION_TYPES_MESSAGE =
  "The session types are not valid. Please reload and try again.";

/**
 * Hub names are unique per implementer and project, ignoring case and surrounding spaces. The
 * unique index hubs_implementer_id_project_id_name_key enforces it; this check only gives the
 * common case a clear message, and the index still catches two saves at the same moment.
 */
async function assertHubNameIsFree(
  tx: Transaction,
  scope: { implementerId: string; projectId: string; hubName: string; exceptHubId?: string },
) {
  const clashing = await tx.query.hub.findFirst({
    where: (h, { and, eq, ne, sql }) =>
      and(
        eq(h.implementerId, scope.implementerId),
        eq(h.projectId, scope.projectId),
        sql`lower(trim(${h.hubName})) = lower(trim(${scope.hubName}))`,
        scope.exceptHubId ? ne(h.id, scope.exceptHubId) : undefined,
      ),
    columns: { id: true },
  });
  if (clashing) {
    throw new AdminActionError(DUPLICATE_NAME_MESSAGE);
  }
}

/** A failed hub save. Only the name index is unique on these rows, so a violation is a clash. */
function hubSaveFailure(error: unknown, fallback: string): ActionResponse<never> {
  if (isUniqueViolation(error)) {
    return { success: false, message: DUPLICATE_NAME_MESSAGE };
  }
  return actionFailure(error, fallback);
}

function newSessionNameRows(
  hubId: string,
  rows: { sessionNameId?: string; type: SessionTypeGroup; label: string; amount: number }[],
  codes: string[],
) {
  return rows.flatMap((row, index) => {
    if (row.sessionNameId) return [];
    if (!isHubSessionCategory(row.type)) {
      throw new AdminActionError(INVALID_SESSION_TYPES_MESSAGE);
    }
    return [
      {
        hubId,
        sessionType: row.type,
        sessionName: codes[index] ?? "",
        sessionLabel: row.label,
        amount: row.amount,
        currency: "KES",
      },
    ];
  });
}

export async function createHub(data: z.infer<typeof CreateHubSchema>): Promise<ActionResponse> {
  try {
    const { implementerId } = await requireSuperAdmin();
    const parsed = CreateHubSchema.parse(data);
    const projectId = await getActiveProjectId();
    const hubId = objectId("hub");
    const codes = assignSessionCodes(parsed.sessionTypes, new Map());
    const sessionNames = newSessionNameRows(hubId, parsed.sessionTypes, codes);

    await db.transaction(async (tx) => {
      await assertHubNameIsFree(tx, { implementerId, projectId, hubName: parsed.hubName });
      await tx.insert(hub).values({ id: hubId, hubName: parsed.hubName, implementerId, projectId });
      if (sessionNames.length > 0) {
        await tx.insert(sessionName).values(sessionNames);
      }
    });

    refresh();
    return { success: true, message: `Successfully added ${parsed.hubName}` };
  } catch (error) {
    return hubSaveFailure(error, "Sorry, could not add the hub.");
  }
}

/**
 * Saves the hub's session types. A stored row keeps its code and type, so only its label and amount
 * change; a stored row left out is removed; a new row gets the next code of its group. Every stored
 * row must be one of this hub's, so a tampered request cannot touch another hub's rows.
 */
async function updateSessionNames(
  tx: Transaction,
  hubId: string,
  submitted: z.infer<typeof UpdateHubSchema>["sessionTypes"],
  loadedSessionNameIds: string[],
) {
  // Locked, so a session being scheduled with one of these session types finishes first and one
  // scheduled later waits for this save. The usage check below is a separate statement, so it sees
  // the sessions that committed while this one waited.
  const stored = await tx
    .select({
      id: sessionName.id,
      sessionName: sessionName.sessionName,
      sessionType: sessionName.sessionType,
      sessionLabel: sessionName.sessionLabel,
      amount: sessionName.amount,
    })
    .from(sessionName)
    .where(eq(sessionName.hubId, hubId))
    .for("update");
  const storedById = new Map(stored.map((n) => [n.id, n]));

  const loaded = new Set(loadedSessionNameIds);
  if (loaded.size !== stored.length || stored.some((n) => !loaded.has(n.id))) {
    throw new AdminActionError(
      "This hub's session types changed since you opened it. Please close the dialog and open it again.",
    );
  }

  const kept = new Set<string>();
  const changed = submitted.filter((row) => {
    if (!row.sessionNameId) return false;
    const current = storedById.get(row.sessionNameId);
    if (!current || kept.has(row.sessionNameId) || current.sessionType !== row.type) {
      throw new AdminActionError(INVALID_SESSION_TYPES_MESSAGE);
    }
    kept.add(row.sessionNameId);
    return current.sessionLabel !== row.label || current.amount !== row.amount;
  });

  // Removed first, so a new row can take the code of a removed one.
  const removedIds = stored.filter((n) => !kept.has(n.id)).map((n) => n.id);
  if (removedIds.length > 0) {
    // Deleting a session name sets the session_id of its sessions to null, so a session type that
    // sessions use stays.
    const [used] = await tx
      .select({ id: interventionSession.id })
      .from(interventionSession)
      .where(inArray(interventionSession.sessionId, removedIds))
      .limit(1);
    if (used) {
      throw new AdminActionError(
        "A session type you removed is used by sessions, so it cannot be removed. Please reload and try again.",
      );
    }
    await tx
      .delete(sessionName)
      .where(and(inArray(sessionName.id, removedIds), eq(sessionName.hubId, hubId)));
  }

  if (changed.length > 0) {
    const rows = sql.join(
      changed.map((row) => sql`(${row.sessionNameId}, ${row.label}, ${row.amount}::integer)`),
      sql`, `,
    );
    await tx.execute(sql`
      update session_names as n
      set session_label = v.label, amount = v.amount, updated_at = now()
      from (values ${rows}) as v(id, label, amount)
      where n.id = v.id and n.hub_id = ${hubId}`);
  }

  const codes = assignSessionCodes(submitted, storedById);
  const added = newSessionNameRows(hubId, submitted, codes);
  if (added.length > 0) {
    await tx.insert(sessionName).values(added);
  }
}

/**
 * A hub's session names for the edit form, each with how many sessions use it. Codes sort by
 * length first, so s10 comes after s9 and the last row of a group is its highest code.
 */
function querySessionNames(hubId: string) {
  return db.query.sessionName.findMany({
    where: (n, { eq }) => eq(n.hubId, hubId),
    columns: { id: true, sessionName: true, sessionType: true, sessionLabel: true, amount: true },
    extras: (n) => ({
      sessionCount: countOf(interventionSession.sessionId, n.id).as("session_count"),
    }),
    orderBy: (n, { asc }) => [asc(sql`length(${n.sessionName})`), asc(n.sessionName), asc(n.id)],
  });
}

export type HubSessionName = Awaited<ReturnType<typeof querySessionNames>>[number];

export async function fetchHubSessionNames(
  hubId: string,
): Promise<ActionResponse<HubSessionName[]>> {
  try {
    const { implementerId } = await requireSuperAdmin();

    const ownHub = await db.query.hub.findFirst({
      where: (h, { and, eq }) => and(eq(h.id, hubId), eq(h.implementerId, implementerId)),
      columns: { id: true },
    });
    if (!ownHub) {
      throw new AdminActionError("Hub not found");
    }

    const sessionNames = await querySessionNames(hubId);
    return { success: true, message: "Loaded the session types", data: sessionNames };
  } catch (error) {
    return actionFailure(error, "Sorry, could not load the hub's session types.");
  }
}

export async function updateHub(data: z.infer<typeof UpdateHubSchema>): Promise<ActionResponse> {
  try {
    const { implementerId } = await requireSuperAdmin();
    const parsed = UpdateHubSchema.parse(data);

    await db.transaction(async (tx) => {
      // Locked, so two edits of one hub run one after the other and cannot give two new session
      // types the same code.
      const [existing] = await tx
        .select({ hubName: hub.hubName, projectId: hub.projectId })
        .from(hub)
        .where(and(eq(hub.id, parsed.hubId), eq(hub.implementerId, implementerId)))
        .for("update");
      if (!existing) {
        throw new AdminActionError("Hub not found");
      }

      if (parsed.hubName !== existing.hubName) {
        // A hub with no project predates project scoping, so it has no peers to clash with.
        if (existing.projectId) {
          await assertHubNameIsFree(tx, {
            implementerId,
            projectId: existing.projectId,
            hubName: parsed.hubName,
            exceptHubId: parsed.hubId,
          });
        }
        await tx
          .update(hub)
          .set({ hubName: parsed.hubName })
          .where(and(eq(hub.id, parsed.hubId), eq(hub.implementerId, implementerId)));
      }

      await updateSessionNames(tx, parsed.hubId, parsed.sessionTypes, parsed.loadedSessionNameIds);
    });

    refresh();
    return { success: true, message: `Successfully updated ${parsed.hubName}` };
  } catch (error) {
    return hubSaveFailure(error, "Sorry, could not update the hub.");
  }
}
