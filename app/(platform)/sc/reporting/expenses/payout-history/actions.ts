"use server";

import { currentSupervisor } from "#/app/auth";

export type SupervisorPayoutHistoryType = Awaited<
  ReturnType<typeof loadSupervisorPayoutHistory>
>[number];

export async function loadSupervisorPayoutHistory() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
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
