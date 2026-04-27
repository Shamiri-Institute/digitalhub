import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import SessionsDatatable from "#/components/common/session/sessions-datatable";
import { db } from "#/lib/db";
import type { PaginationMeta } from "#/lib/types/pagination";

type Props = {
  params: Promise<{ visibleId: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
};

export default async function SchoolSessionsPage({ params, searchParams }: Props) {
  const { visibleId } = await params;
  const { page = "1", pageSize = "20" } = await searchParams;

  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
    return null;
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const size = Math.min(50, Math.max(5, Number(pageSize) || 20));
  const skip = (pageNum - 1) * size;

  const where = { school: { visibleId } };

  const [sessions, totalCount] = await Promise.all([
    db.interventionSession.findMany({
      where,
      include: {
        hub: {
          select: { visibleId: true },
        },
        school: {
          include: {
            assignedSupervisor: true,
            interventionGroups: {
              include: {
                students: {
                  include: {
                    _count: {
                      select: {
                        clinicalCases: true,
                      },
                    },
                    studentAttendances: true,
                  },
                },
              },
            },
          },
        },
        sessionRatings: true,
        session: true,
      },
      skip,
      take: size,
      orderBy: { sessionDate: "desc" },
    }),
    db.interventionSession.count({ where }),
  ]);

  const pagination: PaginationMeta = {
    page: pageNum,
    pageSize: size,
    totalCount,
    totalPages: Math.ceil(totalCount / size),
  };

  return (
    <SessionsDatatable
      sessions={sessions}
      role={fellow.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
      fellowId={fellow.profile?.id}
      pagination={pagination}
    />
  );
}
