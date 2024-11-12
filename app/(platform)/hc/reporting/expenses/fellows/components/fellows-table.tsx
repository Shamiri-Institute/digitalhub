"use client";
import { HubFellowsAttendancesType } from "#/app/(platform)/hc/reporting/expenses/fellows/actions";
import DataTable from "#/components/data-table";

import { columns, subColumns } from "./columns";

export default function HCFellowsDataTable({
  fellowAttendanceExpenses,
}: {
  fellowAttendanceExpenses: HubFellowsAttendancesType[];
}) {
  return (
    <DataTable
      data={fellowAttendanceExpenses}
      columns={columns}
      className="data-table data-table-action mt-4 bg-white"
      renderSubComponent={({ row }) => (
        <DataTable
          data={row.original?.attendances}
          editColumns={false}
          columns={subColumns}
          className="data-table data-table-action border-0 bg-white"
          emptyStateMessage="No expenses found for this fellow"
        />
      )}
      emptyStateMessage="No fellow expenses found"
    />
  );
}
