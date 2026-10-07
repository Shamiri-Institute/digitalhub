"use server";

import { eq } from "drizzle-orm";

import { currentSupervisorLite } from "#/app/auth";
import { fellow } from "#/db/schema";
import {
  type FellowPayoutDetail,
  loadPayoutHistory,
  type PayoutHistoryEntry,
} from "#/lib/actions/expenses/payout-history";

export type { FellowPayoutDetail };
export type SupervisorPayoutHistoryType = PayoutHistoryEntry;

export async function loadSupervisorPayoutHistory(): Promise<SupervisorPayoutHistoryType[]> {
  const supervisor = await currentSupervisorLite();

  if (!supervisor) {
    throw new Error("Unauthorised user");
  }

  return loadPayoutHistory(eq(fellow.supervisorId, supervisor.profile.id));
}
