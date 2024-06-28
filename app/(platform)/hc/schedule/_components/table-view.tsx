import DataTable from "#/app/(platform)/hc/components/data-table";
import { CalendarState } from "react-stately";

export function TableView({
  state,
  hubId,
}: {
  state: CalendarState;
  hubId: string;
}) {
  const columns = [
    {
      header: "School",
      enableSorting: false,
      enableHiding: false,
      accessorKey: "schoolName",
    },
    {
      header: "Fellow name",
      enableSorting: false,
      enableHiding: false,
      accessorKey: "supervisor",
    },
    {
      header: "Fellow name",
      enableSorting: false,
      enableHiding: false,
      accessorKey: "supervisor",
    },
    {
      header: "Phone number",
      enableSorting: false,
      enableHiding: false,
      accessorKey: "supervisor",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={[]}
      emptyStateMessage={"No data available"}
    ></DataTable>
  );
}
