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
      archivedAt: null,
      school: {
        visibleId,
      },
    },
    include: {
      clinicalCases: {
        select: {
          id: true,
          _count: {
            select: { sessions: true },
          },
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
        select: {
          id: true,
          groupName: true,
          leader: {
            select: {
              id: true,
              fellowName: true,
            },
          },
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
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          studentId: true,
          currentGroupId: true,
          fromGroupId: true,
          fromGroup: {
            select: {
              id: true,
              groupName: true,
              leader: {
                select: {
                  id: true,
                  fellowName: true,
                },
              },
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
