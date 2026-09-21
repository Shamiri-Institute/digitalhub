import { eq, sql } from "drizzle-orm";

import type { SchoolFellowTableData } from "#/components/common/fellow/columns";
import FellowsDatatable from "#/components/common/fellow/fellows-datatable";
import { db, queryRaw } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { school } from "#/db/schema";
import { clinicalCasesCountExtras, withClinicalCasesCount } from "#/lib/actions/schedule-data";

export default async function SchoolFellowsPage({
  visibleId,
  role,
  hideActions,
}: {
  visibleId: string;
  role: ImplementerRole;
  hideActions?: boolean;
}) {
  const schoolRow = await db.query.school.findFirst({
    where: (s, { eq }) => eq(s.visibleId, visibleId),
    with: {
      fellowAttendances: {
        with: {
          session: { with: { session: true, school: true } },
          group: true,
          PayoutStatements: true,
        },
      },
      hub: { with: { project: true } },
    },
  });
  if (!schoolRow) {
    throw new Error("No School found");
  }

  const [rawFellows, rawStudents, supervisors] = await Promise.all([
    queryRaw<Omit<SchoolFellowTableData, "students">>(sql`
      SELECT
        f.id,
        f.fellow_name as "fellowName",
        f.fellow_email as "fellowEmail",
        f.cell_number as "cellNumber",
        f.mpesa_number as "mpesaNumber",
        f.mpesa_name as "mpesaName",
        f.gender as "gender",
        f.county as "county",
        f.sub_county as "subCounty",
        f.supervisor_id as "supervisorId",
        f.date_of_birth as "dateOfBirth",
        f.id_number as "idNumber",
        sup.supervisor_name as "supervisorName",
        f.dropped_out as "droppedOut",
        ig.group_name as "groupName",
        ig.id as "groupId",
        ((AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating))/4)::float8 AS "averageRating"
      FROM fellows f
      LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
      LEFT JOIN supervisors sup ON f.supervisor_id = sup.id
      LEFT JOIN
        (SELECT _ig.* FROM intervention_groups _ig WHERE _ig.school_id = ${schoolRow.id}) ig
        ON f.id = ig.leader_id
      WHERE f.hub_id = ${schoolRow.hubId}
      GROUP BY f.id, ig.id, ig.group_name, sup.supervisor_name
  `),
    db.query.student.findMany({
      where: (s, { and, isNull, inArray }) =>
        and(
          isNull(s.archivedAt),
          inArray(
            s.schoolId,
            db.select({ id: school.id }).from(school).where(eq(school.visibleId, visibleId)),
          ),
        ),
      extras: clinicalCasesCountExtras,
    }),
    db.query.supervisor.findMany({
      where: (s, { eq }) => eq(s.hubId, schoolRow.hubId ?? ""),
      with: { fellows: true },
    }),
  ]);
  const students = rawStudents.map(withClinicalCasesCount);

  const fellows = rawFellows.map((fellow) => ({
    ...fellow,
    students: students.filter((student) => student.assignedGroupId === fellow.groupId),
  }));

  return (
    <FellowsDatatable
      fellows={fellows}
      supervisors={supervisors}
      schoolId={schoolRow.id}
      role={role}
      hideActions={hideActions}
      attendances={schoolRow.fellowAttendances}
    />
  );
}
