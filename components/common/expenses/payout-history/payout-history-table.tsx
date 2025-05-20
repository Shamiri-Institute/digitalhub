"use client";
import DataTable from "#/components/data-table";

import { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import { OpsHubsPayoutHistoryType } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import { SupervisorPayoutHistoryType } from "#/app/(platform)/sc/reporting/expenses/payout-history/actions";
import FellowPayoutFilterTab from "#/components/common/expenses/payout-history/payout-filter";
import { columns, subColumns } from "./columns";

export default function FellowPayoutHistoryDataTable({
  payoutHistory,
  customColumns,
}: {
  payoutHistory:
    | HubPayoutHistoryType[]
    | OpsHubsPayoutHistoryType[]
    | SupervisorPayoutHistoryType[];
  customColumns?: typeof columns;
}) {
  return (
    <div className="container w-full grow space-y-3">
      <FellowPayoutFilterTab />
      <DataTable
        data={payoutHistory}
        columns={customColumns ?? columns}
        className="data-table data-table-action bg-white lg:mt-4"
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original?.fellowDetails}
            editColumns={false}
            columns={subColumns}
            className="data-table data-table-action border-0 bg-white"
            emptyStateMessage="No expenses found for this fellow"
            disablePagination={true}
            disableSearch={true}
          />
        )}
        emptyStateMessage="No payouts made yet"
      />
    </div>
  );
}
