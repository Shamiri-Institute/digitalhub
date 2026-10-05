"use server";

import { eq } from "drizzle-orm";
import { signOut } from "next-auth/react";

import { currentSupervisor } from "#/app/auth";
import { db } from "#/db/client";
import { supervisor } from "#/db/schema";

export type SupervisorExpensesType = Awaited<ReturnType<typeof loadSupervisorExpenses>>[number];

export async function loadSupervisorExpenses() {
  const currentSupervisorData = await currentSupervisor();

  if (!currentSupervisorData) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Unauthorised user");
  }

  const hubId = currentSupervisorData.profile?.hubId;
  if (!hubId) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Unauthorised user");
  }
  const supervisorsExpenses = await db.query.reimbursementRequest.findMany({
    where: (r, { inArray }) =>
      inArray(
        r.supervisorId,
        db.select({ id: supervisor.id }).from(supervisor).where(eq(supervisor.hubId, hubId)),
      ),
    with: {
      supervisor: { columns: { id: true, supervisorName: true } },
    },
    orderBy: (r, { asc }) => [asc(r.createdAt), asc(r.id)],
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
