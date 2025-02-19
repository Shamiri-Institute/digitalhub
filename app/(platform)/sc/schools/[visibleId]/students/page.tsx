import { currentSupervisor } from "#/app/auth";
import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";

export default async function StudentsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

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
      assignedGroup: {
        include: {
          leader: true,
        },
      },
      school: {
        include: {
          interventionSessions: true,
        },
      },
      studentGroupTransferTrail: {
        include: {
          fromGroup: {
            include: {
              leader: true,
            },
          },
        },
      },
    },
  });

  return <StudentsDatatable data={students} />;
}
