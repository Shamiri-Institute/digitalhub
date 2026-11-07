/**
 * A fellow writes their group report once their school has held four of the intervention's
 * substantive sessions, the hub session names below. A session's name comes from its
 * `session_names` row; the legacy `intervention_sessions.session_type` text is not set on sessions
 * scheduled in the app.
 */
export const GROUP_REPORT_SESSION_NAMES = ["s1", "s2", "s3", "s4"];
export const GROUP_REPORT_SESSIONS_REQUIRED = 4;

/** How many of the report's sessions a school has held, each name counted once. */
export function heldGroupReportSessionCount(
  sessions: { occurred: boolean | null; session: { sessionName: string } | null }[],
) {
  const heldNames = sessions
    .filter((session) => session.occurred === true)
    .map((session) => session.session?.sessionName)
    .filter((name) => name !== undefined && GROUP_REPORT_SESSION_NAMES.includes(name));
  return new Set(heldNames).size;
}
