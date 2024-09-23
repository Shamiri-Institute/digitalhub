import StudentsDatatable from "#/app/(platform)/hc/schools/[visibleId]/students/components/students-datatable";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";

export default async function StudentsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const hubCoordinator = await currentHubCoordinator();

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
      studentAttendances: {
        include: {
          session: true,
          group: true,
        },
      },
      assignedGroup: true,
      school: {
        include: {
          interventionSessions: true,
        },
      },
    },
  });

  return (
    <>
      <StudentsDatatable
        data={students}
        hubCoordinator={hubCoordinator}
        visibleId={visibleId}
      />
    </>
  );
}
