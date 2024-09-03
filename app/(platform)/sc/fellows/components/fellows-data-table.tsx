"use client";
import DataTable from "#/app/(platform)/hc/components/data-table";
import { columns, FellowAttendanceData, subColumns } from "./columns";

export default function FellowsDataTable({
  fellows,
}: {
  fellows: FellowAttendanceData[];
}) {
  return (
    <DataTable
      data={fellows}
      columns={columns}
      renderSubComponent={({ row }) => (
        <DataTable
          data={row.original.fellowAttendances}
          columns={subColumns}
          emptyStateMessage="No upcoming fellow attendances for this fellow"
        />
      )}
      emptyStateMessage="No Fellows Assigned to you"
    />
  );
}
