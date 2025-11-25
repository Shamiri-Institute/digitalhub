"use client";
import type { ColumnDef } from "@tanstack/react-table";

import type { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import type { OpsHubsPayoutHistoryType } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import type { SupervisorPayoutHistoryType } from "#/app/(platform)/sc/reporting/expenses/payout-history/actions";
import DataTable from "#/components/data-table";
import { columns, subColumns } from "./columns";

type PayoutHistoryType =
  | HubPayoutHistoryType
  | SupervisorPayoutHistoryType
  | OpsHubsPayoutHistoryType;

export default function FellowPayoutHistoryDataTable({
  payoutHistory,
  customColumns,
}: {
  payoutHistory: PayoutHistoryType[];
  customColumns?: ColumnDef<OpsHubsPayoutHistoryType>[];
}) {
  const displayColumns = customColumns || columns;

  return (
    <div className="container w-full grow space-y-3">
      <DataTable
        data={payoutHistory}
        columns={displayColumns as ColumnDef<PayoutHistoryType>[]}
        className="data-table data-table-action bg-white lg:mt-4"
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original?.fellowDetails}
            editColumns={false}
            columns={subColumns}
            className="data-table data-table-action border-0 bg-white"
            emptyStateMessage="No expenses found for this fellow"
          />
        )}
        emptyStateMessage="No payouts made yet"
      />
    </div>
  );
}
