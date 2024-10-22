"use server";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";

export type HubSupervisorExpensesType = Awaited<
  ReturnType<typeof loadHubSupervisorExpenses>
>[number];

export async function loadHubSupervisorExpenses() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
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
    };
  });
}

export async function deleteSupervisorExpenseRequest({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  try {
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
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

export async function approveSupervisorExpense({ id }: { id: string }) {
  try {
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
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
