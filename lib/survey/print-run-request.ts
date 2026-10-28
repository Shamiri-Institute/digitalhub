// Safe in client components: the print form matches its requests by the same key the server hashes.

/** What to print, by the version's prefill: a number of copies per school, or one per student. */
export type PrintRunRequest =
  | { kind: "COUNTS"; schools: { schoolId: string; copies: number }[] }
  // Every active student of the school but the excluded ones. Exclusions, not choices, keep the
  // request small: a hub can have tens of thousands of students.
  | { kind: "STUDENTS"; schools: { schoolId: string; excludedStudentIds: string[] }[] };

/**
 * The same text for the same request. Schools keep their order, which is the print order; a
 * school's exclusions are a set.
 */
export function printRunRequestKey(request: PrintRunRequest) {
  const schools =
    request.kind === "COUNTS"
      ? request.schools.map(({ schoolId, copies }) => [schoolId, copies])
      : request.schools.map(({ schoolId, excludedStudentIds }) => [
          schoolId,
          excludedStudentIds.toSorted(),
        ]);
  return JSON.stringify([request.kind, schools]);
}
