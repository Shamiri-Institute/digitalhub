"use client";
import DataTable from "#/components/data-table";
import { FellowsData } from "../../actions";
import { columns, subColumns } from "./columns";

export default function FellowsDataTable({
  fellows,
}: {
  fellows: FellowsData[];
}) {
  return (
    <DataTable
      data={fellows}
      columns={columns}
      renderSubComponent={({ row }) => (
        <DataTable
          data={row.original.sessions}
          editColumns={false}
          columns={subColumns}
          emptyStateMessage="No groups assigned to this fellow"
        />
      )}
      emptyStateMessage="No Fellows Assigned to you"
    />
  );
}
