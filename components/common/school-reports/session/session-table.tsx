"use client";
import type { SessionReportType } from "#/app/(platform)/hc/reporting/school-reports/session/actions";
import DataTable from "#/components/data-table";

import { columns, subColumns } from "./columns";

export default function SessionReportDataTable({
  sessionReport,
}: {
  sessionReport: SessionReportType[];
}) {
  return (
    <DataTable
      data={sessionReport}
      columns={columns}
      className="data-table data-table-action bg-white lg:mt-4"
      emptyStateMessage="No feedback data found"
      renderSubComponent={({ row }) => (
        <DataTable
          data={row.original?.session}
          editColumns={false}
          columns={subColumns}
          className="data-table data-table-action border-0 bg-white"
          emptyStateMessage="No expenses found for this fellow"
          disablePagination={true}
          disableSearch={true}
        />
      )}
    />
  );
}
