import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentAdminUser } from "#/app/auth";
import StudentsDatatable from "#/components/common/student/students-datatable";
import { getActiveProjectId } from "#/lib/active-project-id";
import { db } from "#/lib/db";

export default async function StudentsPage({ params }: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await params;
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const implementerId = admin?.session?.user.activeMembership?.implementerId;
  const projectId = await getActiveProjectId();

  const students = await db.student.findMany({
    where: {
      archivedAt: null,
      school: {
        visibleId,
        implementerId,
        hub: {
          projectId,
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
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <StudentsDatatable
      students={students}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
