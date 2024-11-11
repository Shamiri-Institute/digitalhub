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

  // TODO: Depends on the payout workflow from the supervisor side
  // TODO:  get the payout history for the hub and get the dateAdded, duration, totalpayoutAmount, and action(csv download link)
  return [] as {
    dateAdded: Date;
    duration: string;
    totalPayoutAmount: number;
    downloadLink: string;
  }[];
}
