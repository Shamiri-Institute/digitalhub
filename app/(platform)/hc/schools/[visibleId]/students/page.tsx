import Loading from "#/app/(platform)/hc/schools/[visibleId]/loading";
import { currentHubCoordinator } from "#/app/auth";
import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";
import { Suspense } from "react";

export default async function StudentsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
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
    <Suspense fallback={<Loading />}>
      <StudentsDatatable students={students} role={hc?.user.membership.role!} />
    </Suspense>
  );
}
