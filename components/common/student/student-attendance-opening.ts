import { ImplementerRole } from "#/db/enums";
import { fetchSessionStudentAttendance } from "#/lib/actions/session/session";
import { getTriageEventsForSession, type TriageEventWithRelations } from "#/lib/actions/triage";

export type StudentAttendanceData = Awaited<
  ReturnType<typeof fetchSessionStudentAttendance>
>["students"][number];

export type SessionAttendance = Awaited<
  ReturnType<typeof fetchSessionStudentAttendance>
>["attendances"][number];

export type StudentsLoad =
  | {
      status: "loaded";
      studentsByGroup: Map<string, StudentAttendanceData[]>;
      attendances: SessionAttendance[];
    }
  | { status: "failed" };

export type TriageEventsLoad =
  | { status: "loaded"; byStudent: Record<string, TriageEventWithRelations> }
  | { status: "failed" };

/** One opening of the dialog on a session, with the loads it started. */
export type StudentAttendanceOpening = {
  /** Counts openings, so each one mounts fresh content, even on the session shown before. */
  number: number;
  sessionId: string;
  students: Promise<StudentsLoad>;
  /** Null for roles that don't triage. */
  triageEvents: Promise<TriageEventsLoad> | null;
};

let openingsStarted = 0;

/**
 * Starts the loads of an opening of the dialog on a session, for the handler that opens it. The
 * loads never reject: use() would throw a failure to the page's error boundary. It lives apart from
 * the dialog so the pages that open it can load the dialog's code after the page.
 */
export function startStudentAttendanceOpening(
  sessionId: string,
  role: ImplementerRole,
): StudentAttendanceOpening {
  openingsStarted += 1;
  return {
    number: openingsStarted,
    sessionId,
    students: loadStudents(sessionId),
    triageEvents: role === ImplementerRole.FELLOW ? loadTriageEvents(sessionId) : null,
  };
}

function loadStudents(sessionId: string): Promise<StudentsLoad> {
  return fetchSessionStudentAttendance(sessionId)
    .then(({ students, attendances }): StudentsLoad => ({
      status: "loaded",
      studentsByGroup: studentsByAssignedGroup(students),
      attendances,
    }))
    .catch((): StudentsLoad => ({ status: "failed" }));
}

export function loadTriageEvents(sessionId: string): Promise<TriageEventsLoad> {
  return getTriageEventsForSession(sessionId)
    .then((events): TriageEventsLoad => ({
      status: "loaded",
      byStudent: Object.fromEntries(events.map((event) => [event.studentId, event])),
    }))
    .catch((): TriageEventsLoad => ({ status: "failed" }));
}

function studentsByAssignedGroup(students: StudentAttendanceData[]) {
  const byGroup = new Map<string, StudentAttendanceData[]>();
  for (const student of students) {
    const groupId = student.assignedGroupId ?? "";
    byGroup.set(groupId, [...(byGroup.get(groupId) ?? []), student]);
  }
  return byGroup;
}
