// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool, queryRaw } from "#/db/client";
import { clinicalScreeningInfo, student } from "#/db/schema";
import { countOf } from "#/db/sql";

afterAll(() => pool.end());

describe("countOf", () => {
  it("counts the same at the query root and nested under a relation", async () => {
    const [target] = await queryRaw<{ studentId: string; schoolId: string; n: number }>(sql`
      select c.student_id as "studentId", s.school_id as "schoolId", count(*)::int as n
      from clinical_screening_info c join students s on s.id = c.student_id
      where s.school_id is not null
      group by c.student_id, s.school_id
      order by n desc limit 1`);
    if (!target) throw new Error("seed the database first: no student with a clinical case");
    expect(target.n).toBeGreaterThan(0);

    const extras = (s: { id: typeof student.id }) => ({
      clinicalCasesCount: countOf(clinicalScreeningInfo.studentId, s.id).as("clinical_cases_count"),
    });

    // Root of a query without `with`: Drizzle's single-table shortcut, where an unqualified
    // column would bind to the subquery's table and return 0.
    const root = await db.query.student.findFirst({
      where: (s, { eq }) => eq(s.id, target.studentId),
      columns: { id: true },
      extras,
    });
    expect(root?.clinicalCasesCount).toBe(target.n);

    // Nested under a relation: the column lives on an aliased lateral join.
    const school = await db.query.school.findFirst({
      where: (sc, { eq }) => eq(sc.id, target.schoolId),
      columns: { id: true },
      with: {
        students: {
          where: (s, { eq }) => eq(s.id, target.studentId),
          columns: { id: true },
          extras,
        },
      },
    });
    expect(school?.students[0]?.clinicalCasesCount).toBe(target.n);

    expect(
      await db.$count(clinicalScreeningInfo, eq(clinicalScreeningInfo.studentId, target.studentId)),
    ).toBe(target.n);
  });
});
