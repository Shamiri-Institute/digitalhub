"use server";

import { eq, isNull } from "drizzle-orm";
import { signOut } from "next-auth/react";

import { currentHubCoordinator, currentSupervisor } from "#/app/auth";
import { db } from "#/db/client";
import { reimbursementRequest, supervisor } from "#/db/schema";
import { objectId } from "#/lib/crypto";

export type SupervisorExpensesType = Awaited<ReturnType<typeof loadSupervisorExpenses>>[number];

export async function loadSupervisorExpenses() {
  const currentSupervisorData = await currentSupervisor();

  if (!currentSupervisorData) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Unauthorised user");
  }

  const hubId = currentSupervisorData.profile?.hubId;
  const supervisorsExpenses = await db.query.reimbursementRequest.findMany({
    where: (r, { inArray }) =>
      inArray(
        r.supervisorId,
        db
          .select({ id: supervisor.id })
          .from(supervisor)
          // Prisma `hubId: null` matched supervisors with no hub; keep that for a supervisor without one.
          .where(hubId === null ? isNull(supervisor.hubId) : eq(supervisor.hubId, hubId)),
      ),
    with: {
      supervisor: { columns: { id: true, supervisorName: true } },
    },
  });

  return supervisorsExpenses.map((expense) => {
    const details = expense.details;
    const typeOfExpense =
      typeof details === "object" &&
      details !== null &&
      "subtype" in details &&
      typeof details.subtype === "string"
        ? details.subtype
        : "N/A";
    const session =
      typeof details === "object" &&
      details !== null &&
      "session" in details &&
      typeof details.session === "string"
        ? details.session
        : "N/A";
    return {
      id: expense.id,
      supervisorName: expense.supervisor.supervisorName,
      dateCreated: expense.createdAt,
      dateOfExpense: expense.incurredAt,
      typeOfExpense,
      session,
      destination: "N/A",
      amount: expense.amount,
      status: expense.status,
      // TODO: Add hub coordinator name
      hubCoordinatorName: "N/A",
      mpesaName: expense.mpesaName,
      mpesaNumber: expense.mpesaNumber,
    };
  });
}

export async function deleteSupervisorExpenseRequest({ id, name }: { id: string; name: string }) {
  try {
    const currentSupervisorData = await currentSupervisor();

    if (!currentSupervisorData) {
      await signOut({ callbackUrl: "/login" });
      throw new Error("Unauthorised user");
    }
    if (name !== currentSupervisorData.profile?.supervisorName) {
      return {
        success: false,
        message: "Please enter the correct name",
      };
    }

    const deleted = await db
      .delete(reimbursementRequest)
      .where(eq(reimbursementRequest.id, id))
      .returning({ id: reimbursementRequest.id });
    if (deleted.length === 0) {
      throw new Error(`Expense ${id} not found`);
    }

    return {
      success: true,
      message: "Successfully deleted expense",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to delete expense",
    };
  }
}

export async function getSupervisorsInHub() {
  const hubCoordinator = await currentHubCoordinator();
  const hubId = hubCoordinator?.profile?.assignedHubId ?? "";
  return await db.query.supervisor.findMany({
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

    const updated = await db
      .update(reimbursementRequest)
      .set({ status: "APPROVED" })
      .where(eq(reimbursementRequest.id, id))
      .returning({ id: reimbursementRequest.id });
    if (updated.length === 0) {
      throw new Error(`Expense ${id} not found`);
    }

    return {
      success: true,
      message: "Successfully approved expense",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to approve expense ",
    };
  }
}

export async function addSupervisorExpense({
  data,
}: {
  data: {
    expenseType: string;
    mpesaName: string;
    mpesaNumber: string;
    session: string;
    totalAmount: string;
    week: string;
    supervisor: string;
  };
}) {
  try {
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
      await signOut({ callbackUrl: "/login" });
      throw new Error("Unauthorised user");
    }

    await db.insert(reimbursementRequest).values({
      id: objectId("reimb"),
      supervisorId: data.supervisor,
      hubId: hubCoordinator.profile?.assignedHubId ?? "",
      hubCoordinatorId: hubCoordinator.profile?.id ?? "",
      incurredAt: new Date(data.week),
      amount: Number.parseInt(data.totalAmount, 10),
      kind: data.expenseType,
      status: "PENDING",
      details: {
        subtype: data.expenseType,
        session: data.session,
      },
      mpesaName: data.mpesaName,
      mpesaNumber: data.mpesaNumber,
    });

    return {
      success: true,
      message: "Successfully added expense",
    };
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
  data: {
    expenseType: string;
    mpesaName: string;
    mpesaNumber: string;
    session: string;
    totalAmount: string;
    week: string;
  };
}) {
  try {
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
      await signOut({ callbackUrl: "/login" });
      throw new Error("Unauthorised user");
    }

    const updated = await db
      .update(reimbursementRequest)
      .set({
        incurredAt: new Date(data.week),
        amount: Number.parseInt(data.totalAmount, 10),
        kind: data.expenseType,
        details: {
          subtype: data.expenseType,
          session: data.session,
        },
        mpesaName: data.mpesaName,
        mpesaNumber: data.mpesaNumber,
      })
      .where(eq(reimbursementRequest.id, id))
      .returning({ id: reimbursementRequest.id });
    if (updated.length === 0) {
      throw new Error(`Expense ${id} not found`);
    }

    return {
      success: true,
      message: "Successfully updated expense",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update expense",
    };
  }
}
