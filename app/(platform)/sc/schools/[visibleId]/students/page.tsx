import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentSupervisor } from "#/app/auth";
import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/lib/db";

export default async function StudentsPage(props: { params: Promise<{ visibleId: string }> }) {
  const params = await props.params;

  const { visibleId } = params;

  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

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
          session: {
            include: {
              session: true,
            },
          },
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
          interventionSessions: {
            include: { session: true },
          },
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

  return (
    <StudentsDatatable
      students={students}
      role={supervisor?.session?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
    />
  );
}
