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
    };
  });
}

export async function approveSupervisorExpense({
  id,
  amount,
}: {
  id: string;
  amount: number;
}) {
  try {
    // action goes here

    return {
      success: true,
      message: `Successfully approved expense`,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: `Failed to approve expense }`,
    };
  }
}
