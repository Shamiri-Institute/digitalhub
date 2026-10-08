import { notFound } from "next/navigation";
import type React from "react";
import SchoolLeftPanel from "#/components/common/schools/school-left-panel";
import SchoolsBreadcrumb from "#/components/common/schools/schools-breadcrumb";
import SchoolsNav from "#/components/common/schools/schools-nav";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
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
      },
      hub: {
        columns: { hubName: true },
        with: { sessions: { columns: { sessionName: true, sessionType: true } } },
      },
      schoolDropoutHistory: {
        columns: { id: true, droppedOut: true, dropoutReason: true, createdAt: true },
        with: { user: { columns: { name: true } } },
      },
    },
    // Raw SQL with a derived table on purpose: drizzle 0.45 rewrites other tables' columns inside
    // `extras` to this table's alias, and at the top level it emits the outer column unqualified
    // (`"id"`), so the inner table must not expose a column of the same name.
    extras: (s, { sql }) => ({
      interventionSessionsCount:
        sql<number>`(select count(*)::int from (select school_id from intervention_sessions) i where i.school_id = ${s.id})`.as(
          "intervention_sessions_count",
        ),
      studentsCount:
        sql<number>`(select count(*)::int from (select school_id from students where archived_at is null) st where st.school_id = ${s.id})`.as(
          "students_count",
        ),
      interventionGroupsCount:
        sql<number>`(select count(*)::int from (select school_id from intervention_groups) g where g.school_id = ${s.id})`.as(
          "intervention_groups_count",
        ),
    }),
  });
}

export type SchoolPanelData = NonNullable<Awaited<ReturnType<typeof loadSchoolPanel>>>;

export default async function SchoolViewLayout({
  visibleId,
  children,
}: {
  visibleId: string;
  children: React.ReactNode;
}) {
  const school = await loadSchoolPanel(visibleId);
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
          <SchoolsBreadcrumb />
          <SchoolsNav />
          <Separator />
          {children}
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
