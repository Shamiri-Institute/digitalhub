"use client";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { FellowsData } from "../../actions";
import AddNewFellowForm from "../../components/add-new-fellow-form";
import { columns, subColumns } from "./columns";

function renderTableActions() {
  return (
    <div>
      <AddNewFellowForm>
        <Button>New Fellow</Button>
      </AddNewFellowForm>
    </div>
  );
}

export default function FellowsDataTable({
  fellows,
}: {
  fellows: FellowsData[];
}) {
  return (
    <DataTable
      data={fellows}
      columns={columns}
      renderTableActions={renderTableActions()}
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
