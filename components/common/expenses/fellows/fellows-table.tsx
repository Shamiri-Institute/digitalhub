"use client";
import { HubFellowsAttendancesType } from "#/app/(platform)/hc/reporting/expenses/fellows/actions";
import {
  columns,
  subColumns,
} from "#/components/common/expenses/fellows/columns";
import DataTable from "#/components/data-table";

export default function FellowsReportingDataTable({
  fellowAttendanceExpenses,
}: {
  fellowAttendanceExpenses: HubFellowsAttendancesType[];
}) {
  return (
    <DataTable
      data={fellowAttendanceExpenses}
      columns={columns}
      className="data-table data-table-action bg-white lg:mt-4"
      renderSubComponent={({ row }) => (
        <DataTable
          data={row.original?.attendances}
          editColumns={false}
          columns={subColumns}
          className="data-table data-table-action border-0 bg-white"
          emptyStateMessage="No expenses found for this fellow"
          disableSearch={true}
          disablePagination={true}
        />
      )}
      emptyStateMessage="No fellow expenses found"
    />
  );
}
