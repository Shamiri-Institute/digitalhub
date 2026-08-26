"use server";

import { Prisma } from "@prisma/client";
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

  return loadPayoutHistory(Prisma.sql`hub_id = ${hubCoordinator.profile?.assignedHubId}`);
}
