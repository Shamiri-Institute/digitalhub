"use client";
import { SessionReportType } from "#/app/(platform)/sc/reporting/school-reports/session/actions";
import DataTable from "#/components/data-table";

import { columns, subColumns } from "./columns";

export default function SessionReportDataTable({
  sessionReport,
}: {
  sessionReport: SessionReportType[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <DataTable
        data={sessionReport}
        columns={columns}
        className="data-table data-table-action mt-4 bg-white"
        emptyStateMessage="No feedback data found"
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original?.session}
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
