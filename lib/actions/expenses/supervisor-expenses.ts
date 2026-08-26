import type { Prisma } from "@prisma/client";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

/**
 * Shared core for supervisor reimbursement expenses. Each role's
 * actions.ts resolves its own auth, passes the request scope it may see,
 * and chooses the coordinator label shown per row (the HC dashboard shows
 * the coordinator's own name; ops shows the expense's hub name).
 */
export async function loadSupervisorExpenses(
  where: Prisma.ReimbursementRequestWhereInput,
  coordinatorLabel: (expense: SupervisorExpenseRecord) => string | null | undefined,
) {
  const supervisorsExpenses = await db.reimbursementRequest.findMany({
    where,
    include: {
      supervisor: {
        select: {
          id: true,
          supervisorName: true,
        },
      },
      hub: {
        select: {
          hubName: true,
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
      hubCoordinatorName: coordinatorLabel(expense),
      mpesaName: expense.mpesaName,
      mpesaNumber: expense.mpesaNumber,
    };
  });
}

export type SupervisorExpenseRecord = Prisma.ReimbursementRequestGetPayload<{
  include: {
    supervisor: { select: { id: true; supervisorName: true } };
    hub: { select: { hubName: true } };
  };
}>;

export async function deleteSupervisorExpense(id: string) {
  try {
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

export async function approveSupervisorExpenseRequest(id: string) {
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

export type SupervisorExpenseInput = {
  expenseType: string;
  mpesaName: string;
  mpesaNumber: string;
  receiptFileKey: string;
  session: string;
  totalAmount: string;
  week: string;
  supervisor: string;
};

export async function createSupervisorExpense(
  data: SupervisorExpenseInput,
  scope: { hubId: string; hubCoordinatorId: string },
) {
  try {
    await db.reimbursementRequest.create({
      data: {
        id: objectId("reimb"),
        supervisorId: data.supervisor,
        hubId: scope.hubId,
        hubCoordinatorId: scope.hubCoordinatorId,
        incurredAt: new Date(data.week),
        amount: Number.parseInt(data.totalAmount, 10),
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

export async function updateSupervisorExpenseRequest(
  id: string,
  data: Omit<SupervisorExpenseInput, "receiptFileKey" | "supervisor">,
) {
  try {
    await db.reimbursementRequest.update({
      where: { id },
      data: {
        incurredAt: new Date(data.week),
        amount: Number.parseInt(data.totalAmount, 10),
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
