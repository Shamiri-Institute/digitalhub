"use server";

import { signOut } from "next-auth/react";
import { currentHubCoordinator } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

export type HubSupervisorExpensesType = Awaited<
  ReturnType<typeof loadHubSupervisorExpenses>
>[number];

export async function loadHubSupervisorExpenses() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Unauthorised user");
  }

  const supervisorsExpenses = await db.reimbursementRequest.findMany({
    where: {
      supervisor: {
        hubId: hubCoordinator.assignedHubId,
      },
    },
    include: {
      supervisor: {
        select: {
          id: true,
          supervisorName: true,
        },
      },
    },
  });

  return supervisorsExpenses.map((expense) => {
    const details = expense.details;
    const typeOfExpense =
      typeof details === "object" && details !== null && "subtype" in details
        ? details.subtype
        : "N/A";
    const session =
      typeof details === "object" && details !== null && "session" in details
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
      hubCoordinatorName: hubCoordinator.coordinatorName,
      mpesaName: expense.mpesaName,
      mpesaNumber: expense.mpesaNumber,
    };
  });
}

export async function deleteSupervisorExpenseRequest({ id, name }: { id: string; name: string }) {
  try {
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
      await signOut({ callbackUrl: "/login" });
      throw new Error("Unauthorised user");
    }
    if (name !== hubCoordinator.coordinatorName) {
      return {
        success: false,
        message: "Please enter the correct name",
      };
    }

    await db.reimbursementRequest.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Successfully approved expense",
    };
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
  return await db.supervisor.findMany({
    where: {
      hubId: hubCoordinator?.assignedHubId!,
    },
  });
}

export async function approveSupervisorExpense({ id }: { id: string }) {
  try {
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
      await signOut({ callbackUrl: "/login" });
      throw new Error("Unauthorised user");
    }

    await db.reimbursementRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
      },
    });

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
    receiptFileKey: string;
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

    await db.reimbursementRequest.create({
      data: {
        id: objectId("reimb"),
        supervisorId: data.supervisor,
        hubId: hubCoordinator.assignedHubId!,
        hubCoordinatorId: hubCoordinator.id,
        incurredAt: new Date(data.week),
        amount: Number.parseInt(data.totalAmount),
        kind: data.expenseType,
        status: "PENDING",
        details: {
          subtype: data.expenseType,
          receipt_link: data.receiptFileKey,
          session: data.session,
        },
        mpesaName: data.mpesaName,
        mpesaNumber: data.mpesaNumber,
      },
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

    await db.reimbursementRequest.update({
      where: { id },
      data: {
        incurredAt: new Date(data.week),
        amount: Number.parseInt(data.totalAmount),
        kind: data.expenseType,
        details: {
          subtype: data.expenseType,
          session: data.session,
        },
        mpesaName: data.mpesaName,
        mpesaNumber: data.mpesaNumber,
      },
    });

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
