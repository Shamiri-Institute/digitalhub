"use server";

import { inArray } from "drizzle-orm";

import { currentSupervisor } from "#/app/auth";
import { fellow } from "#/db/schema";
import {
  type FellowPayoutDetail,
  loadPayoutHistory,
  type PayoutHistoryEntry,
} from "#/lib/actions/expenses/payout-history";
import { supervisedFellowIds } from "#/lib/auth/require-hub-role";

export type { FellowPayoutDetail };
export type SupervisorPayoutHistoryType = PayoutHistoryEntry;

export async function loadSupervisorPayoutHistory(): Promise<SupervisorPayoutHistoryType[]> {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    throw new Error("Unauthorised user");
  }

  return loadPayoutHistory(inArray(fellow.id, supervisedFellowIds(supervisor.profile.id)));
}
