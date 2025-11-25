import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentHubCoordinator } from "#/app/auth";
import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/lib/db";

export default async function StudentsPage(props: { params: Promise<{ visibleId: string }> }) {
  const params = await props.params;

  const { visibleId } = params;

  const hc = await currentHubCoordinator();
  if (!hc) {
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
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <StudentsDatatable
      students={students}
      role={hc?.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
    />
  );
}
