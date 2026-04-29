import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/lib/db";
import type { PaginationMeta } from "#/lib/types/pagination";

type Props = {
  params: Promise<{ visibleId: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string; search?: string }>;
};

export default async function StudentsPage({ params, searchParams }: Props) {
  const { visibleId } = await params;
  const { page = "1", pageSize = "20", search } = await searchParams;

  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
    return null;
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const size = Math.min(50, Math.max(5, Number(pageSize) || 20));
  const skip = (pageNum - 1) * size;

  const where = {
    archivedAt: null,
    school: { visibleId },
    assignedGroup: {
      leaderId: fellow.profile?.id,
      school: { visibleId },
    },
    ...(search ? { studentName: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [students, totalCount] = await Promise.all([
    db.student.findMany({
      where,
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
      skip,
      take: size,
      orderBy: { createdAt: "desc" },
    }),
    db.student.count({ where }),
  ]);

  const pagination: PaginationMeta = {
    page: pageNum,
    pageSize: size,
    totalCount,
    totalPages: Math.ceil(totalCount / size),
  };

  return (
    <StudentsDatatable
      students={students}
      role={fellow.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
      pagination={pagination}
      searchValue={search ?? ""}
    />
  );
}
