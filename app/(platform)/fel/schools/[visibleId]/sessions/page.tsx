import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { signOut } from "next-auth/react";

import { currentFellow } from "#/app/auth";
import SessionsDatatable from "#/components/common/session/sessions-datatable";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { school } from "#/db/schema";
import { visibleSchoolIds } from "#/lib/auth/require-hub-role";

export default async function SchoolSessionsPage(props: {
  params: Promise<{ visibleId: string }>;
}) {
  const params = await props.params;

  const { visibleId } = params;

  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const visibleSchools = await visibleSchoolIds();
  // Every session belongs to the same school, so the school with its groups is
  // loaded once and attached below instead of being recomputed per session by a lateral join.
  const [rows, schoolRow] = await Promise.all([
    db.query.interventionSession.findMany({
      where: (s, { inArray }) =>
        inArray(
          s.schoolId,
          db
            .select({ id: school.id })
            .from(school)
            .where(and(eq(school.visibleId, visibleId), inArray(school.id, visibleSchools.ids))),
        ),
      with: {
        sessionRatings: true,
        session: true,
      },
    }),
    db.query.school.findFirst({
      where: (s, { and, eq, inArray }) =>
        and(eq(s.visibleId, visibleId), inArray(s.id, visibleSchools.ids)),
      with: {
        assignedSupervisor: true,
        interventionGroups: {
          with: {
            leader: { columns: { fellowName: true } },
          },
        },
      },
    }),
  ]);

  if (!schoolRow) {
    notFound();
  }
  const sessions = rows.map((s) => ({ ...s, school: schoolRow }));

  return (
    <SessionsDatatable
      sessions={sessions}
      role={fellow?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
      fellowId={fellow?.profile?.id}
    />
  );
}
