"use client";
import type { ColumnDef } from "@tanstack/react-table";

import type { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import type { ImplementerPayoutHistoryType } from "#/app/(platform)/admin/reporting/expenses/payout-history/actions";
import ExpandableReportTable from "#/components/common/expandable-report-table";
import { columns, subColumns } from "./columns";

type PayoutHistoryType = HubPayoutHistoryType | ImplementerPayoutHistoryType;

export default function FellowPayoutHistoryDataTable({
  payoutHistory,
  customColumns,
}: {
  payoutHistory: PayoutHistoryType[];
  customColumns?: ColumnDef<ImplementerPayoutHistoryType>[];
}) {
  return (
    <ExpandableReportTable
      data={payoutHistory}
      columns={(customColumns || columns) as ColumnDef<PayoutHistoryType>[]}
      subColumns={subColumns}
      getSubRows={(row) => row.fellowDetails}
      emptyStateMessage="No payouts made yet"
      subEmptyStateMessage="No expenses found for this fellow"
      subDisableSearch={false}
      subDisablePagination={false}
    />
  );
}
