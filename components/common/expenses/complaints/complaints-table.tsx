"use client";

import type { HubReportComplaintsType } from "#/app/(platform)/hc/reporting/expenses/complaints/actions";
import ExpandableReportTable from "#/components/common/expandable-report-table";
import { columns, subColumns } from "#/components/common/expenses/complaints/columns";

export default function FellowComplaintsDataTable({
  complaints,
}: {
  complaints: HubReportComplaintsType[];
}) {
  return (
    <ExpandableReportTable
      data={complaints}
      columns={columns}
      subColumns={subColumns}
      getSubRows={(row) => row.complaints}
      emptyStateMessage="No complaints found"
      subEmptyStateMessage="No complaints found for this fellow"
    />
  );
}
