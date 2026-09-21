"use server";

import { sql } from "drizzle-orm";

import { currentHubCoordinator } from "#/app/auth";
import {
  type FellowPayoutDetail,
  loadPayoutHistory,
  type PayoutHistoryEntry,
} from "#/lib/actions/expenses/payout-history";

export type { FellowPayoutDetail };
export type HubPayoutHistoryType = PayoutHistoryEntry;

export async function loadHubPayoutHistory(): Promise<HubPayoutHistoryType[]> {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }

  return loadPayoutHistory(sql`f.hub_id = ${hubCoordinator.profile?.assignedHubId}`);
}
