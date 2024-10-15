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

    return {
      id: expense.id,
      supervisorName: expense.supervisor.supervisorName,
      dateCreated: expense.createdAt,
      dateOfExpense: expense.incurredAt,
      typeOfExpense,
      session: "N/A",
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
  actualName,
}: {
  id: string;
  name: string;
  actualName: string;
}) {
  try {
    if (name !== actualName) {
      return {
        success: false,
        message: "Please enter the correct name",
      };
    }

    await await db.reimbursementRequest.delete({
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
