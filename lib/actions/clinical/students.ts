import { type SQL, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "#/db/client";
import { clinicalScreeningInfo, clinicalSessionAttendance, supervisor } from "#/db/schema";
import { type ClinicalScope, hubScope } from "./scope";

export async function fetchOverallStudentsDataBreakdown(scope: ClinicalScope) {
  const sc = hubScope(scope, "sc");
  const sn = hubScope(scope, "sn");

  const {
    rows: [counts],
  } = await db.execute<{
    totalStudents: number;
    groupSessions: number;
    clinicalCases: number;
    clinicalSessions: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int
        FROM students s
        JOIN schools sc ON s.school_id = sc.id
        ${sc.join}
        WHERE ${sc.where}) AS "totalStudents",
      (SELECT COUNT(*)::int
        FROM intervention_sessions ins
        JOIN session_names sn ON ins.session_id = sn.id
        ${sn.join}
        WHERE ${sn.where}) AS "groupSessions",
      (SELECT COUNT(*)::int
        FROM clinical_screening_info csi
        JOIN students sts ON sts.id = csi.student_id
        JOIN schools sc ON sts.school_id = sc.id
        ${sc.join}
        WHERE ${sc.where}) AS "clinicalCases",
      (SELECT COUNT(*)::int
        FROM clinical_session_attendance cs
        JOIN clinical_screening_info csi ON csi.id = cs."case_id"
        JOIN students sts ON sts.id = csi.student_id
        JOIN schools sc ON sts.school_id = sc.id
        ${sc.join}
        WHERE ${sc.where}) AS "clinicalSessions"
  `);

  return {
    totalStudents: counts?.totalStudents ?? 0,
    groupSessions: counts?.groupSessions ?? 0,
    clinicalCases: counts?.clinicalCases ?? 0,
    clinicalSessions: counts?.clinicalSessions ?? 0,
  };
}

export async function fetchStudentsDataBreakdown(scope: ClinicalScope) {
  const sc = hubScope(scope, "sc");
  const sn = hubScope(scope, "sn");

  const [attendanceData, dropoutData, completionData, ratingsData] = await Promise.all([
    db
      .execute<{ sessionName: string | null; count: number }>(sql`
      SELECT
        sn.session_name as "sessionName",
        COUNT(DISTINCT sa.student_id)::int as count
      FROM student_attendances sa
      JOIN students s ON s.id = sa.student_id
      JOIN schools sc ON s.school_id = sc.id
      JOIN intervention_sessions ins ON ins.id = sa.session_id
      JOIN session_names sn ON sn.id = ins.session_id
      ${sc.join}
      WHERE ${sc.where}
      AND sa.attended = true
      GROUP BY sn.session_name
      ORDER BY sn.session_name ASC
    `)
      .then((r) => r.rows),

    db
      .execute<{ reason: string | null; count: number }>(sql`
      SELECT drop_out_reason as reason, COUNT(*)::int as count
      FROM students s
      JOIN schools sc ON s.school_id = sc.id
      ${sc.join}
      WHERE ${sc.where}
      AND drop_out_reason IS NOT NULL
      GROUP BY drop_out_reason
      ORDER BY count DESC
    `)
      .then((r) => r.rows),

    db
      .execute<{ name: string; value: number }>(sql`
      WITH total_students AS (
        SELECT COUNT(*) as total
        FROM students s
        JOIN schools sc ON s.school_id = sc.id
        ${sc.join}
        WHERE ${sc.where}
      ),
      incomplete_students_data AS (
        SELECT COUNT(*) as incomplete
        FROM students s
        JOIN schools sc ON s.school_id = sc.id
        ${sc.join}
        WHERE ${sc.where}
        AND (
          s.student_name IS NULL
          OR s.gender IS NULL
          OR s.year_of_birth IS NULL
          OR s.form IS NULL
        )
      )
      SELECT
        'actual' as name,
        CASE
          WHEN total = 0 THEN 0
          ELSE ROUND((incomplete::float / NULLIF(total, 0)::float) * 100)
        END as value
      FROM total_students, incomplete_students_data
      UNION ALL
      SELECT
        'target' as name,
        0 as value
      `)
      .then((r) => r.rows),

    db
      .execute<{
        session_name: string | null;
        avg_student_behavior_rating: number | null;
      }>(sql`
      SELECT sn.session_name, AVG(isr.student_behavior_rating)::float8 as avg_student_behavior_rating
      FROM intervention_session_ratings isr
      JOIN intervention_sessions ins ON ins.id = isr.session_id
      JOIN session_names sn ON sn.id = ins.session_id
      ${sn.join}
      WHERE ${sn.where}
      GROUP BY sn.session_name
      ORDER BY sn.session_name ASC
    `)
      .then((r) => r.rows),
  ]);

  return {
    attendanceData: attendanceData.map((item) => ({
      name: item.sessionName || "Unknown",
      value: Number(item.count),
    })),
    dropoutData: dropoutData.map((item) => ({
      name: item.reason || "Unknown",
      value: Number(item.count),
    })),
    completionData: completionData,
    ratingsData: ratingsData.map((item) => ({
      session: item.session_name || "Unknown",
      value: item.avg_student_behavior_rating ? Number(item.avg_student_behavior_rating) : 0,
    })),
  };
}

/** Sums grouped `count`s by a key, largest first, as the charts' `{ name, value }` rows. */
function countsByName<T extends { count: number }>(rows: T[], key: (row: T) => string | null) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const name = key(row) || "Unknown";
    totals.set(name, (totals.get(name) ?? 0) + row.count);
  }
  return [...totals]
    .map(([name, value]) => ({ name, value }))
    .toSorted((x, y) => y.value - x.value);
}

export async function fetchClinicalSessionsDataBreakdown(scope: ClinicalScope) {
  const sc = hubScope(scope, "sc");
  const sp = hubScope(scope, "sp");

  const [caseGroups, casesBySession, casesBySupervisor] = await Promise.all([
    db
      .execute<{
        caseStatus: string | null;
        initialReferredFrom: string | null;
        count: number;
      }>(sql`
      SELECT case_status as "caseStatus", initial_referred_from_specified as "initialReferredFrom",
        COUNT(*)::int as count
      FROM clinical_screening_info csi
      JOIN students s ON s.id = csi.student_id
      JOIN schools sc ON s.school_id = sc.id
      ${sc.join}
      WHERE ${sc.where}
      GROUP BY case_status, initial_referred_from_specified
    `)
      .then((r) => r.rows),

    db
      .execute<{ session: string | null; count: number }>(sql`
      SELECT session, COUNT(*)::int as count
      FROM clinical_session_attendance csa
      JOIN clinical_screening_info csi ON csi.id = csa."case_id"
      JOIN students s ON s.id = csi.student_id
      JOIN schools sc ON s.school_id = sc.id
      ${sc.join}
      WHERE ${sc.where}
      GROUP BY session
      ORDER BY count DESC
    `)
      .then((r) => r.rows),

    db
      .execute<{ supervisorName: string | null; count: number }>(sql`
      SELECT sp.supervisor_name as "supervisorName", COUNT(*)::int as count
      FROM clinical_screening_info csi
      JOIN students s ON s.id = csi.student_id
      JOIN supervisors sp ON sp.id = csi.current_supervisor_id
      ${sp.join}
      WHERE ${sp.where}
      GROUP BY sp.supervisor_name
      ORDER BY count DESC
    `)
      .then((r) => r.rows),
  ]);

  return {
    casesByStatus: countsByName(caseGroups, (item) => item.caseStatus),
    casesBySession: casesBySession.map((item) => ({
      name: item.session || "Unknown",
      value: Number(item.count),
    })),
    casesBySupervisor: casesBySupervisor.map((item) => ({
      name: item.supervisorName || "Unknown",
      value: Number(item.count),
    })),
    casesByInitialContact: countsByName(caseGroups, (item) => item.initialReferredFrom),
  };
}

export async function fetchStudentsStatsBreakdown(scope: ClinicalScope) {
  const sc = hubScope(scope, "sc");

  const { rows: groups } = await db.execute<{
    form: number | null;
    age: number | null;
    gender: string | null;
    count: number;
  }>(sql`
    SELECT
      form,
      CASE
        WHEN year_of_birth IS NULL THEN NULL
        ELSE (EXTRACT(YEAR FROM CURRENT_DATE) - year_of_birth)::int
      END as age,
      gender,
      COUNT(*)::int as count
    FROM students s
    JOIN schools sc ON s.school_id = sc.id
    ${sc.join}
    WHERE ${sc.where}
    GROUP BY 1, 2, 3
  `);

  return {
    formStats: countsByKey(groups, (g) => g.form).map(([form, value]) => ({
      form: form ? `Form ${form}` : "N/A",
      value,
    })),
    ageStats: countsByKey(groups, (g) => g.age).map(([age, value]) => ({
      age: age ? `${age} years` : "N/A",
      value,
    })),
    genderStats: countsByKey(groups, (g) => g.gender).map(([gender, value]) => ({
      gender: gender || "N/A",
      value,
    })),
  };
}

/** Sums grouped `count`s by a key, in ascending key order with nulls last, as SQL `ORDER BY key` does. */
function countsByKey<T extends { count: number }, K extends string | number | null>(
  rows: T[],
  key: (row: T) => K,
) {
  const totals = new Map<K, number>();
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + row.count);
  return [...totals].toSorted(([x], [y]) =>
    x === null ? 1 : y === null ? -1 : x < y ? -1 : x > y ? 1 : 0,
  );
}

/** Clinical case and session counts for the students pages, for the cases that `caseFilter` selects. */
export async function fetchStudentClinicalStats(caseFilter: SQL | undefined) {
  const caseIds = db
    .select({ id: clinicalScreeningInfo.id })
    .from(clinicalScreeningInfo)
    .where(caseFilter);
  const [caseGroups, sessionGroups] = await Promise.all([
    db
      .select({
        caseStatus: clinicalScreeningInfo.caseStatus,
        supervisorId: clinicalScreeningInfo.currentSupervisorId,
        supervisorName: supervisor.supervisorName,
        initialReferredFromSpecified: clinicalScreeningInfo.initialReferredFromSpecified,
        cases: count(),
        referredCases: count(clinicalScreeningInfo.initialReferredFrom),
      })
      .from(clinicalScreeningInfo)
      .leftJoin(supervisor, eq(supervisor.id, clinicalScreeningInfo.currentSupervisorId))
      .where(caseFilter)
      .groupBy(
        clinicalScreeningInfo.caseStatus,
        clinicalScreeningInfo.currentSupervisorId,
        supervisor.supervisorName,
        clinicalScreeningInfo.initialReferredFromSpecified,
      ),
    db
      .select({ session: clinicalSessionAttendance.session, count: count() })
      .from(clinicalSessionAttendance)
      .where(inArray(clinicalSessionAttendance.caseId, caseIds))
      .groupBy(clinicalSessionAttendance.session),
  ]);

  const casesByStatus: Record<string, number> = {};
  const casesBySupervisor = new Map<string, { supervisorName: string; count: number }>();
  const casesByReferredFrom = new Map<string | null, number>();
  for (const group of caseGroups) {
    if (group.caseStatus) {
      casesByStatus[group.caseStatus] = (casesByStatus[group.caseStatus] ?? 0) + group.cases;
    }
    if (group.supervisorId) {
      const entry = casesBySupervisor.get(group.supervisorId) ?? {
        supervisorName: group.supervisorName || "Unknown",
        count: 0,
      };
      entry.count += group.cases;
      casesBySupervisor.set(group.supervisorId, entry);
    }
    const referredFrom = group.initialReferredFromSpecified;
    casesByReferredFrom.set(
      referredFrom,
      (casesByReferredFrom.get(referredFrom) ?? 0) + group.referredCases,
    );
  }

  return {
    caseCount: caseGroups.reduce((total, group) => total + group.cases, 0),
    sessionCount: sessionGroups.reduce((total, group) => total + group.count, 0),
    casesByStatus,
    sessionsBySession: sessionGroups,
    casesBySupervisor: [...casesBySupervisor.values()],
    casesByReferredFrom: [...casesByReferredFrom].map(([initialReferredFromSpecified, count]) => ({
      initialReferredFromSpecified,
      count,
    })),
  };
}

export type StudentClinicalStats = Awaited<ReturnType<typeof fetchStudentClinicalStats>>;
