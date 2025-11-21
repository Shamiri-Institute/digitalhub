import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/lib/db";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ visibleId: string }>;
}) {
  const { visibleId } = await params;
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const students = await db.student.findMany({
    where: {
      school: {
        visibleId,
      },
      assignedGroup: {
        leaderId: fellow?.id,
        school: {
          visibleId,
        },
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
            include: {
              session: true,
            },
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
      role={fellow?.user.membership.role!}
      fellowId={fellow?.id}
    />
  );
}
