import { db } from "#/lib/db";

/**
 * Shared query: find intervention groups led by a fellow.
 * Auth checks should be done by the caller before invoking this.
 */
export function findFellowGroups(fellowId: string) {
  return db.interventionGroup.findMany({
    where: {
      leaderId: fellowId,
    },
    select: {
      id: true,
      groupName: true,
      schoolId: true,
      school: {
        select: {
          id: true,
          schoolName: true,
        },
      },
    },
    orderBy: {
      groupName: "asc",
    },
  });
}

/**
 * Shared query: find occurred sessions for a school.
 * Auth checks should be done by the caller before invoking this.
 */
export async function findSchoolSessions(schoolId: string) {
  const sessions = await db.interventionSession.findMany({
    where: {
      schoolId,
      occurred: true,
    },
    select: {
      id: true,
      sessionType: true,
      sessionDate: true,
      session: {
        select: {
          sessionName: true,
        },
      },
    },
    orderBy: {
      sessionDate: "desc",
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    sessionType: session.sessionType,
    sessionDate: session.sessionDate,
    sessionName: session.session?.sessionName ?? session.sessionType,
  }));
}

/**
 * Shared query: check if a recording already exists for the given combination.
 * Uses the unique composite constraint on SessionRecording.
 */
export function findExistingRecording(params: {
  fellowId: string;
  schoolId: string;
  groupId: string;
  sessionId: string;
}) {
  return db.sessionRecording.findUnique({
    where: {
      unique_recording_per_session: {
        fellowId: params.fellowId,
        schoolId: params.schoolId,
        groupId: params.groupId,
        sessionId: params.sessionId,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });
}
