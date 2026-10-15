import { notFound } from "next/navigation";
import type React from "react";
import { getCurrentUserSession } from "#/app/auth";
import SchoolLeftPanel from "#/components/common/schools/school-left-panel";
import SchoolsBreadcrumb from "#/components/common/schools/schools-breadcrumb";
import SchoolsNav from "#/components/common/schools/schools-nav";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
import { interventionGroup, interventionSession, student } from "#/db/schema";
import { countOf } from "#/db/sql";
import { visibleSchoolIds } from "#/lib/auth/require-hub-role";

async function loadSchoolPanel(visibleId: string) {
  const visibleSchools = await visibleSchoolIds();
  return db.query.school.findFirst({
    where: (s, { and, eq, inArray }) =>
      and(eq(s.visibleId, visibleId), inArray(s.id, visibleSchools.ids)),
    columns: {
      schoolName: true,
      schoolType: true,
      schoolEmail: true,
      schoolCounty: true,
      schoolSubCounty: true,
      latitude: true,
      longitude: true,
      principalName: true,
      principalPhone: true,
      pointPersonName: true,
      pointPersonPhone: true,
    },
    with: {
      interventionSessions: {
        columns: { occurred: true, status: true },
        with: { session: { columns: { sessionName: true } } },
        orderBy: (schoolSession, { desc }) => [
          desc(schoolSession.sessionDate),
          desc(schoolSession.id),
        ],
      },
      hub: {
        columns: { hubName: true },
        with: {
          sessions: {
            columns: { sessionName: true, sessionType: true },
            orderBy: (hubSession, { asc }) => [asc(hubSession.createdAt), asc(hubSession.id)],
          },
        },
      },
      schoolDropoutHistory: {
        columns: { id: true, droppedOut: true, dropoutReason: true, createdAt: true },
        with: { user: { columns: { name: true } } },
        orderBy: (history, { asc }) => [asc(history.createdAt), asc(history.id)],
      },
    },
    extras: (s, { sql }) => ({
      interventionSessionsCount: countOf(interventionSession.schoolId, s.id).as(
        "intervention_sessions_count",
      ),
      studentsCount: countOf(student.schoolId, s.id, sql`archived_at is null`).as("students_count"),
      interventionGroupsCount: countOf(interventionGroup.schoolId, s.id).as(
        "intervention_groups_count",
      ),
    }),
  });
}

export type SchoolPanelData = NonNullable<Awaited<ReturnType<typeof loadSchoolPanel>>>;

async function loadBreadcrumbSchools() {
  const visibleSchools = await visibleSchoolIds();
  return db.query.school.findMany({
    where: (s, { inArray }) => inArray(s.id, visibleSchools.ids),
    columns: { visibleId: true, schoolName: true },
    with: { hub: { columns: { hubName: true } } },
    orderBy: (s, { asc }) => asc(s.schoolName),
  });
}

export type BreadcrumbSchool = Awaited<ReturnType<typeof loadBreadcrumbSchools>>[number];

export default async function SchoolViewLayout({
  visibleId,
  children,
}: {
  visibleId: string;
  children: React.ReactNode;
}) {
  const [school, breadcrumbSchools, session] = await Promise.all([
    loadSchoolPanel(visibleId),
    loadBreadcrumbSchools(),
    getCurrentUserSession(),
  ]);
  const role = session?.user.activeMembership?.role;
  if (!school) {
    notFound();
  }
  return (
    <div className="flex h-full bg-white">
      <aside className="hidden lg:flex lg:w-1/4">
        <SchoolLeftPanel open={true} school={school} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="container w-full min-w-0 grow space-y-5 pb-6 pl-6 pr-8 pt-5">
          <SchoolsBreadcrumb schools={breadcrumbSchools} role={role} />
          <SchoolsNav role={role} />
          <Separator />
          {children}
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
