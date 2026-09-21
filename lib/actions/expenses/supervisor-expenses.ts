import type { SQL } from "drizzle-orm";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { reimbursementRequest } from "#/db/schema";
import { objectId } from "#/lib/crypto";

/** The rows the report is built from, with the supervisor and hub names it shows. */
async function fetchSupervisorExpenses(scope: SQL | undefined) {
  return db.query.reimbursementRequest.findMany({
    where: scope,
    with: {
      supervisor: { columns: { id: true, supervisorName: true } },
      hub: { columns: { hubName: true } },
    },
  });
}

export type SupervisorExpenseRecord = Awaited<ReturnType<typeof fetchSupervisorExpenses>>[number];

/**
 * Shared core for supervisor reimbursement expenses. Each role's
 * actions.ts resolves its own auth, passes the request scope it may see (a
 * condition on the `reimbursementRequest` table), and chooses the coordinator
 * label shown per row (the HC dashboard shows the coordinator's own name; ops
 * shows the expense's hub name).
 */
export async function loadSupervisorExpenses(
  scope: SQL | undefined,
  coordinatorLabel: (expense: SupervisorExpenseRecord) => string | null | undefined,
) {
  const supervisorsExpenses = await fetchSupervisorExpenses(scope);

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
      hubCoordinatorName: coordinatorLabel(expense),
      mpesaName: expense.mpesaName,
      mpesaNumber: expense.mpesaNumber,
    };
  });
}

export async function deleteSupervisorExpense(id: string) {
  try {
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

export async function approveSupervisorExpenseRequest(id: string) {
  try {
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

export type SupervisorExpenseInput = {
  expenseType: string;
  mpesaName: string;
  mpesaNumber: string;
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
    await db.insert(reimbursementRequest).values({
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

export async function updateSupervisorExpenseRequest(
  id: string,
  data: Omit<SupervisorExpenseInput, "supervisor">,
) {
  try {
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
