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

export async function deleteSupervisorExpenseRequest({ id, name }: { id: string; name: string }) {
  try {
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
      await signOut({ callbackUrl: "/login" });
      throw new Error("Unauthorised user");
    }
    if (name !== hubCoordinator.profile?.coordinatorName) {
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
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
      await signOut({ callbackUrl: "/login" });
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
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
      await signOut({ callbackUrl: "/login" });
      throw new Error("Unauthorised user");
    }

    if (!hubCoordinator.profile?.assignedHubId) {
      throw new Error("Hub coordinator has no assigned hub");
    }

    return await createSupervisorExpense(data, {
      hubId: hubCoordinator.profile.assignedHubId,
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
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
      await signOut({ callbackUrl: "/login" });
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
