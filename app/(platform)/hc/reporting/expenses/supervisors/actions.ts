"use server";

import { eq, inArray } from "drizzle-orm";
import { signOut } from "next-auth/react";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/db/client";
import { reimbursementRequest, supervisor } from "#/db/schema";
import {
  approveSupervisorExpenseRequest,
  createSupervisorExpense,
  deleteSupervisorExpense,
  loadSupervisorExpenses,
  type SupervisorExpenseInput,
  updateSupervisorExpenseRequest,
} from "#/lib/actions/expenses/supervisor-expenses";

export type HubSupervisorExpensesType = Awaited<
  ReturnType<typeof loadHubSupervisorExpenses>
>[number];

export async function loadHubSupervisorExpenses() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Unauthorised user");
  }

  const hubId = hubCoordinator.profile?.assignedHubId;
  if (!hubId) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Unauthorised user");
  }
  return loadSupervisorExpenses(
    inArray(
      reimbursementRequest.supervisorId,
      db.select({ id: supervisor.id }).from(supervisor).where(eq(supervisor.hubId, hubId)),
    ),
    () => hubCoordinator.profile?.coordinatorName,
  );
}

/** The coordinator, their hub, and the condition that limits expenses to that hub's supervisors. */
async function requireHubScope() {
  const hubCoordinator = await currentHubCoordinator();
  const hubId = hubCoordinator?.profile.assignedHubId;
  if (!hubCoordinator || !hubId) {
    throw new Error("Unauthorised user");
  }
  const hubSupervisors = db
    .select({ id: supervisor.id })
    .from(supervisor)
    .where(eq(supervisor.hubId, hubId));
  return {
    hubCoordinator,
    hubId,
    scope: inArray(reimbursementRequest.supervisorId, hubSupervisors),
  };
}

export async function deleteSupervisorExpenseRequest({ id, name }: { id: string; name: string }) {
  try {
    const { hubCoordinator, scope } = await requireHubScope();
    if (name !== hubCoordinator.profile?.coordinatorName) {
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

export async function getSupervisorsInHub() {
  const hubCoordinator = await currentHubCoordinator();
  if (!hubCoordinator) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Unauthorised user");
  }
  const hubId = hubCoordinator.profile.assignedHubId;
  if (!hubId) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Unauthorised user");
  }
  return db.query.supervisor.findMany({
    where: (s, { eq }) => eq(s.hubId, hubId),
  });
}

export async function approveSupervisorExpense({ id }: { id: string }) {
  try {
    const { scope } = await requireHubScope();
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
    const { hubCoordinator, hubId } = await requireHubScope();
    const inHub = await db.query.supervisor.findFirst({
      where: (s, { and, eq }) => and(eq(s.id, data.supervisor), eq(s.hubId, hubId)),
      columns: { id: true },
    });
    if (!inHub) {
      throw new Error("Supervisor not found in your hub");
    }

    return await createSupervisorExpense(data, {
      hubId,
      hubCoordinatorId: hubCoordinator.profile.id,
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
    const { scope } = await requireHubScope();
    return await updateSupervisorExpenseRequest(id, data, scope);
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update expense",
    };
  }
}
