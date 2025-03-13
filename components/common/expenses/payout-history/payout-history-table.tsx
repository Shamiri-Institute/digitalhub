"use client";
import DataTable from "#/components/data-table";

import { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import FellowPayoutFilterTab from "#/components/common/expenses/payout-history/payout-filter";
import { columns } from "./columns";

export default function FellowPayoutHistoryDataTable({
  payoutHistory,
}: {
  payoutHistory: HubPayoutHistoryType[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <FellowPayoutFilterTab />
      <DataTable
        data={payoutHistory}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No payout history found"
      />
    </div>
  );
}
