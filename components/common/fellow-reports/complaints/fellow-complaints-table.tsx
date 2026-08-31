"use client";

import ExpandableReportTable from "#/components/common/expandable-report-table";
import type { FellowComplaintsType } from "#/components/common/fellow-reports/complaints/actions";
import { columns, subColumns } from "./columns";

export default function FellowComplaintsTable({
  fellowComplaints,
}: {
  fellowComplaints: FellowComplaintsType[];
}) {
  return (
    <ExpandableReportTable
      data={fellowComplaints}
      columns={columns}
      subColumns={subColumns}
      getSubRows={(row) => row.complaints}
      emptyStateMessage="No complaints found"
      subEmptyStateMessage="No complaints found for this fellow"
    />
  );
}
