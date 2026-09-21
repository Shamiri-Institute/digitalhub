"use server";

import { eq } from "drizzle-orm";

import { currentHubCoordinator } from "#/app/auth";
import { fellow } from "#/db/schema";
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

  return loadPayoutHistory(eq(fellow.hubId, hubCoordinator.profile.assignedHubId ?? ""));
}
