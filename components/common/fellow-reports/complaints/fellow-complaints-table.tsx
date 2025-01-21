"use client";

import { FellowComplaintsType } from "#/components/common/fellow-reports/complaints/actions";
import DataTable from "#/components/data-table";
import { columns, subColumns } from "./columns";

export default function FellowComplaintsTable({
  fellowComplaints,
}: {
  fellowComplaints: FellowComplaintsType[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <DataTable
        data={fellowComplaints}
        columns={columns}
        className="data-table data-table-action mt-4 bg-white"
        emptyStateMessage="No feedback data found"
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original?.complaints}
            editColumns={false}
            columns={subColumns}
            className="data-table data-table-action border-0 bg-white"
            emptyStateMessage="No expenses found for this fellow"
          />
        )}
      />
    </div>
  );
}
