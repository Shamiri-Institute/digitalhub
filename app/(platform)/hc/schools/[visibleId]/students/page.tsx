import { db } from "#/lib/db";
import DataTable from "../../components/data-table";
import { columns } from "./components/columns";

export default async function StudentsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const students = await db.student.findMany({
    where: {
      school: {
        visibleId,
      },
    },
    include: {
      clinicalCases: {
        include: {
          sessions: true,
        },
      },
      assignedGroup: true,
    },
  });

  return (
    <DataTable
      data={students}
      columns={columns}
      emptyStateMessage="No students found"
    />
  );
}
