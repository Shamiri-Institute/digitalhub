"use server";

import { currentHubCoordinator } from "#/app/auth";

export type HubPayoutHistoryType = Awaited<
  ReturnType<typeof loadHubPayoutHistory>
>[number];

export async function loadHubPayoutHistory() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }

  // TODO:  get the payout history for the hub and get the dateAdded, duration, totalpayoutAmount, and action(csv download link)
  return [];
}
