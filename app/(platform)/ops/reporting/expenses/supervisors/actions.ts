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

export async function loadHubsSupervisorExpenses() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    throw new Error("Unauthorised user");
  }

  const projectId = await getActiveProjectId();
  const implementerId = opsUser.session.user.activeMembership?.implementerId;

  const inProject = inArray(
    reimbursementRequest.hubId,
    db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId)),
  );
  const scope =
    implementerId === undefined
      ? inProject
      : and(
          inArray(
            reimbursementRequest.supervisorId,
            db
              .select({ id: supervisor.id })
              .from(supervisor)
              .where(eq(supervisor.implementerId, implementerId)),
          ),
          inProject,
        );

  return loadSupervisorExpenses(scope, (expense) => expense.hub.hubName);
}

export async function deleteSupervisorExpenseRequest({ id, name }: { id: string; name: string }) {
  try {
    const opsUser = await currentOpsUser();

    if (!opsUser) {
      throw new Error("Unauthorised user");
    }

    if (name !== opsUser.profile.name) {
      return {
        success: false,
        message: "Please enter the correct name",
      };
    }

    return await deleteSupervisorExpense(id);
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
    const opsUser = await currentOpsUser();

    if (!opsUser) {
      throw new Error("Unauthorised user");
    }

    return await approveSupervisorExpenseRequest(id);
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
    const opsUser = await currentOpsUser();

    if (!opsUser) {
      throw new Error("Unauthorised user");
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
    const opsUser = await currentOpsUser();

    if (!opsUser) {
      throw new Error("Unauthorised user");
    }

    return await updateSupervisorExpenseRequest(id, data);
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update expense",
    };
  }
}
