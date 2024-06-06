import DataTable from "#/app/(platform)/hc/components/data-table";
import { fetchFellowAttendances } from "#/lib/actions/fetch-fellow-attendances";
import { useEffect, useState } from "react";
import { CalendarState } from "react-stately";

export function TableView({
  state,
  hubId,
}: {
  state: CalendarState;
  hubId: string;
}) {
  const [attendances, setAttendances] = useState([]);
  useEffect(() => {
    async function fetchAttendances() {
      const result = await fetchFellowAttendances({
        where: {
          school: { hubId },
        },
      });
      setAttendances(result as any);
    }

    fetchAttendances();
  }, []);

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

  const tableData = attendances.map((row: any) => ({
    schoolName: row.id,
  }));

  return (
    <DataTable
      columns={columns}
      data={[]}
      emptyStateMessage={"No data available"}
    ></DataTable>
  );
}
