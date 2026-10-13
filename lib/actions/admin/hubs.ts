"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import type { z } from "zod";

import { db, isUniqueViolation, type Transaction } from "#/db/client";
import { hub, sessionName } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";
import { hubSessionTypes } from "#/lib/app-constants/hub-session-types";
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

/**
 * The session names of a new hub: every standard session type, with the label and amount the super
 * admin entered. The name and type always come from the standard list, never from the client, so
 * the submitted list must hold exactly the standard names.
 */
function buildSessionNames(
  hubId: string,
  submitted: z.infer<typeof CreateHubSchema>["sessionTypes"],
) {
  const entered = new Map(submitted.map((sessionType) => [sessionType.name, sessionType]));
  if (entered.size !== submitted.length || submitted.length !== hubSessionTypes.length) {
    throw new AdminActionError(INVALID_SESSION_TYPES_MESSAGE);
  }

  return hubSessionTypes.map((standard) => {
    const values = entered.get(standard.name);
    if (!values) {
      throw new AdminActionError(INVALID_SESSION_TYPES_MESSAGE);
    }
    return {
      hubId,
      sessionType: standard.type,
      sessionName: standard.name,
      sessionLabel: values.label,
      amount: values.amount,
      currency: "KES",
    };
  });
}

export async function createHub(data: z.infer<typeof CreateHubSchema>): Promise<ActionResponse> {
  try {
    const { implementerId } = await requireSuperAdmin();
    const parsed = CreateHubSchema.parse(data);
    const projectId = await getActiveProjectId();
    // Built before the transaction, so an invalid request never reaches the database.
    const hubId = objectId("hub");
    const sessionNames = buildSessionNames(hubId, parsed.sessionTypes);

    await db.transaction(async (tx) => {
      await assertHubNameIsFree(tx, { implementerId, projectId, hubName: parsed.hubName });
      await tx.insert(hub).values({ id: hubId, hubName: parsed.hubName, implementerId, projectId });
      await tx.insert(sessionName).values(sessionNames);
    });

    refresh();
    return { success: true, message: `Successfully added ${parsed.hubName}` };
  } catch (error) {
    return hubSaveFailure(error, "Sorry, could not add the hub.");
  }
}

/**
 * Saves the label and amount of the hub's own session names. Every submitted row must be one of
 * this hub's, and a row's code and type never change, so a tampered request cannot touch another
 * hub's rows or rename a code that sessions rely on.
 */
async function updateSessionNames(
  tx: Transaction,
  hubId: string,
  submitted: z.infer<typeof UpdateHubSchema>["sessionTypes"],
) {
  const stored = await tx.query.sessionName.findMany({
    where: (n, { eq }) => eq(n.hubId, hubId),
    columns: { id: true, sessionLabel: true, amount: true },
  });
  const storedById = new Map(stored.map((n) => [n.id, n]));

  const seen = new Set<string>();
  const changed = submitted.filter((row) => {
    const current = storedById.get(row.sessionNameId);
    if (!current || seen.has(row.sessionNameId)) {
      throw new AdminActionError(INVALID_SESSION_TYPES_MESSAGE);
    }
    seen.add(row.sessionNameId);
    return current.sessionLabel !== row.label || current.amount !== row.amount;
  });
  if (changed.length === 0) return;

  // One statement for every changed row; hub_id in the WHERE keeps it to this hub's rows.
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

/** A hub's session names, in a stable order for the edit form. */
function querySessionNames(hubId: string) {
  return db.query.sessionName.findMany({
    where: (n, { eq }) => eq(n.hubId, hubId),
    columns: { id: true, sessionName: true, sessionType: true, sessionLabel: true, amount: true },
    orderBy: (n, { asc }) => [asc(n.sessionName), asc(n.id)],
  });
}

export type HubSessionName = Awaited<ReturnType<typeof querySessionNames>>[number];

/** The session names of one of the caller's hubs, for the edit dialog. */
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
      const existing = await tx.query.hub.findFirst({
        where: (h, { and, eq }) => and(eq(h.id, parsed.hubId), eq(h.implementerId, implementerId)),
        columns: { hubName: true, projectId: true },
      });
      if (!existing) {
        throw new AdminActionError("Hub not found");
      }

      // Only a new name can clash, so an edit to session types alone never runs the check.
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

      await updateSessionNames(tx, parsed.hubId, parsed.sessionTypes);
    });

    refresh();
    return { success: true, message: `Successfully updated ${parsed.hubName}` };
  } catch (error) {
    return hubSaveFailure(error, "Sorry, could not update the hub.");
  }
}
