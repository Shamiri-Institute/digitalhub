import type { ImplementerRole } from "@prisma/client";
import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/lib/db";

export default async function SchoolStudentsPage({
  visibleId,
  role,
}: {
  visibleId: string;
  role: ImplementerRole;
}) {
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
    orderBy: {
      updatedAt: "desc",
    },
  });

  return <StudentsDatatable students={students} role={role} />;
}
