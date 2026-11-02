import { db } from "#/db/client";
import { interventionSessionRating } from "#/db/schema";
import { countOf } from "#/db/sql";

/** The caller checks it may see the hub first. */
export async function fetchSchoolsTableRows(hubId: string) {
  return db.query.school.findMany({
    where: (s, { eq }) => eq(s.hubId, hubId),
    orderBy: (s, { asc }) => [asc(s.schoolName), asc(s.id)],
    columns: {
      id: true,
      visibleId: true,
      createdAt: true,
      archivedAt: true,
      schoolName: true,
      schoolType: true,
      schoolEmail: true,
      schoolCounty: true,
      schoolSubCounty: true,
      schoolDemographics: true,
      boardingDay: true,
      numbersExpected: true,
      pointPersonName: true,
      pointPersonPhone: true,
      pointPersonEmail: true,
      principalName: true,
      principalPhone: true,
      assignedSupervisorId: true,
      droppedOut: true,
      droppedOutAt: true,
    },
    with: {
      assignedSupervisor: {
        columns: { supervisorName: true, cellNumber: true, supervisorEmail: true },
      },
      interventionSessions: {
        columns: { sessionDate: true, occurred: true, sessionType: true },
        with: { session: { columns: { sessionName: true } } },
        extras: (session) => ({
          sessionRatingsCount: countOf(interventionSessionRating.sessionId, session.id).as(
            "session_ratings_count",
          ),
        }),
      },
    },
  });
}
