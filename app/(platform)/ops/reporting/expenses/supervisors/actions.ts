"use server";

import { and, eq, inArray } from "drizzle-orm";

import { currentOpsUser } from "#/app/auth";
import { db } from "#/db/client";
import { hub, reimbursementRequest, supervisor } from "#/db/schema";
import {
  approveSupervisorExpenseRequest,
  createSupervisorExpense,
  deleteSupervisorExpense,
  loadSupervisorExpenses,
  type SupervisorExpenseInput,
  updateSupervisorExpenseRequest,
} from "#/lib/actions/expenses/supervisor-expenses";
import { getActiveProjectId } from "#/lib/active-project-id";

export type HubSupervisorExpensesType = Awaited<
  ReturnType<typeof loadHubsSupervisorExpenses>
>[number];

/**
 * The ops user and the requests they may see and change: the active project's hubs, and their
 * implementer's supervisors. `supervisorScope` is the same rule for a supervisor row.
 */
async function requireOpsScope() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    throw new Error("Unauthorised user");
  }

  const projectId = await getActiveProjectId();
  const implementerId = opsUser.session.user.activeMembership?.implementerId;
  const projectHubs = db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId));
  const implementerSupervisors =
    implementerId === undefined
      ? undefined
      : db
          .select({ id: supervisor.id })
          .from(supervisor)
          .where(eq(supervisor.implementerId, implementerId));

  return {
    opsUser,
    scope: and(
      inArray(reimbursementRequest.hubId, projectHubs),
      implementerSupervisors && inArray(reimbursementRequest.supervisorId, implementerSupervisors),
    ),
    supervisorScope: and(
      inArray(supervisor.hubId, projectHubs),
      implementerId === undefined ? undefined : eq(supervisor.implementerId, implementerId),
    ),
  };
}

export async function loadHubsSupervisorExpenses() {
  const { scope } = await requireOpsScope();
  return loadSupervisorExpenses(scope, (expense) => expense.hub.hubName);
}

export async function deleteSupervisorExpenseRequest({ id, name }: { id: string; name: string }) {
  try {
    const { opsUser, scope } = await requireOpsScope();

    if (name !== opsUser.profile.name) {
      return {
        success: false,
        message: "Please enter the correct name",
      };
    }

    return await deleteSupervisorExpense(id, scope);
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to approve expense",
    };
  }
}

export async function getSupervisorsInImplementation() {
  const opsUser = await currentOpsUser();
  const implementerId = opsUser?.session.user.activeMembership?.implementerId;

  return db.query.supervisor.findMany({
    where: (s, { eq }) =>
      implementerId === undefined ? undefined : eq(s.implementerId, implementerId),
  });
}

export async function approveSupervisorExpense({ id }: { id: string }) {
  try {
    const { scope } = await requireOpsScope();
    return await approveSupervisorExpenseRequest(id, scope);
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to approve expense ",
    };
  }
}

export async function addSupervisorExpense({ data }: { data: SupervisorExpenseInput }) {
  try {
    const { opsUser, supervisorScope } = await requireOpsScope();
    const inScope = await db
      .select({ id: supervisor.id })
      .from(supervisor)
      .where(and(eq(supervisor.id, data.supervisor), supervisorScope));
    if (inScope.length === 0) {
      throw new Error("Supervisor not found in your project");
    }

    return await createSupervisorExpense(data, {
      hubId: opsUser.profile.assignedHubId ?? "",
      hubCoordinatorId: opsUser.profile.id,
    });
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to add expense ",
    };
  }
}

export async function updateSupervisorExpense({
  id,
  data,
}: {
  id: string;
  data: Omit<SupervisorExpenseInput, "supervisor">;
}) {
  try {
    const { scope } = await requireOpsScope();
    return await updateSupervisorExpenseRequest(id, data, scope);
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update expense",
    };
  }
}
