import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/lib/db";

export default async function StudentsPage({ params }: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await params;
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const students = await db.student.findMany({
    where: {
      archivedAt: null,
      school: {
        visibleId,
      },
      assignedGroup: {
        leaderId: fellow?.profile?.id,
        school: {
          visibleId,
        },
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
            include: {
              session: true,
            },
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
      role={fellow?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
    />
  );
}
