import Loading from "#/app/(platform)/hc/schools/[visibleId]/loading";
import StudentsDatatable from "#/app/(platform)/hc/schools/[visibleId]/students/components/students-datatable";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";
import { Suspense } from "react";

export default async function StudentsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const hubCoordinator = await currentHubCoordinator();

  const students = db.student.findMany({
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
    <Suspense fallback={<Loading />}>
      <StudentsDatatable data={students} hubCoordinator={hubCoordinator} />
    </Suspense>
  );
}
