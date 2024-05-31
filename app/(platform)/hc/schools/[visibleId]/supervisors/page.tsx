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
              schoolId: visibleId,
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
      emptyStateMessage="No supervisors found for this school"
    />
  );
}
