import { db } from "#/lib/db";
import DataTable from "../../../components/data-table";
import { columns } from "./components/columns";

export default async function SupervisorsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const supervisors = await db.supervisor.findMany({
    where: {
      fellows: {
        some: {
          groups: {
            some: {
              school: {
                visibleId: visibleId,
              },
            },
          },
        },
      },
    },
    include: {
      assignedSchools: true,
      fellows: true,
    },
  });

  return (
    <DataTable
      data={supervisors}
      columns={columns}
      className={"data-table data-table-action mt-4"}
      emptyStateMessage="No supervisors found for this school"
    />
  );
}
