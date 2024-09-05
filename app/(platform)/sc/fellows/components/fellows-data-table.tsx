"use client";
import DataTable from "#/app/(platform)/hc/components/data-table";
import { loadFellowsData } from "../../actions";
import { columns, subColumns } from "./columns";

export default async function FellowsDataTable() {
  const fellows = await loadFellowsData();
  return (
    <DataTable
      data={fellows}
      columns={columns}
      renderSubComponent={({ row }) => (
        <DataTable
          data={row.original.sessions}
          editColumns={false}
          columns={subColumns}
          emptyStateMessage="No upcoming sessions for this fellow"
        />
      )}
      emptyStateMessage="No Fellows Assigned to you"
    />
  );
}
