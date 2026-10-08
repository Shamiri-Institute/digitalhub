import { eq, inArray } from "drizzle-orm";

import SessionsDatatable from "#/components/common/session/sessions-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { interventionSession, school } from "#/db/schema";
import { fetchHubFellowRatings, fetchScheduleSupervisors } from "#/lib/actions/schedule-data";

export default async function SchoolSessionsPage({
  visibleId,
  role,
  supervisorId,
}: {
  visibleId: string;
  role: ImplementerRole;
  supervisorId?: string;
}) {
  // Every session of the page belongs to this one school, so its groups are loaded once and
  // attached in JS instead of being recomputed per session row.
  const schoolRow = await db.query.school.findFirst({
    where: (s, { eq }) => eq(s.visibleId, visibleId),
    with: { assignedSupervisor: true, interventionGroups: true },
  });
  // Supervisors and fellow ratings are scoped by the school's own hub, which
  // for hc and sc is the same hub as the signed-in user's.
  const hubId = schoolRow?.hubId ?? "";

  const schoolSessions = inArray(
    interventionSession.schoolId,
    db.select({ id: school.id }).from(school).where(eq(school.visibleId, visibleId)),
  );
  const [rawSessions, supervisors, fellowRatings] = await Promise.all([
    db.query.interventionSession.findMany({
      where: schoolSessions,
      with: { sessionRatings: true, session: true },
      orderBy: (s, { asc }) => asc(s.sessionDate),
    }),
    fetchScheduleSupervisors([hubId], schoolSessions),
    fetchHubFellowRatings(hubId),
  ]);

  const sessions = rawSessions.map((s) => ({ ...s, school: schoolRow ?? null }));

  return (
    <SessionsDatatable
      sessions={sessions}
      supervisors={supervisors}
      fellowRatings={fellowRatings}
      role={role}
      supervisorId={supervisorId}
    />
  );
}
