"use client";
import DataTable from "#/components/data-table";

import { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import PayoutFilterTab from "#/app/(platform)/hc/reporting/expenses/payout-history/components/payout-filter";
import { Prisma } from "@prisma/client";
import { columns } from "./columns";

export default function HCPayoutHistoryDataTable({
  payoutHistory,
  currentHubCoordinator,
}: {
  payoutHistory: HubPayoutHistoryType[];
  currentHubCoordinator: Prisma.HubCoordinatorGetPayload<{}>;
}) {
  return (
    <div className="container w-full grow space-y-3">
      <PayoutFilterTab hubId={currentHubCoordinator.assignedHubId!} />
      <DataTable
        data={payoutHistory}
        columns={columns}
        className="data-table data-table-action mt-4 bg-white"
        emptyStateMessage="No payout history found"
      />
    </div>
  );
}
