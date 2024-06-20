"use server";

import { Prisma } from "@prisma/client";

import { FellowAttendancesTableData } from "#/app/(platform)/hc/schedule/_components/fellow-attendance";
import { db } from "#/lib/db";

export async function fetchFellowAttendances({
  where,
  include,
}: {
  where: Prisma.FellowAttendanceWhereInput;
  include?: Prisma.FellowAttendanceInclude;
}) {
  const attendances = await db.fellowAttendance.findMany({
    where,
    include: {
      session: true,
      ...include,
    },
  });

  return attendances;
}

export async function fetchSessionFellowAttendances({
  sessionId,
}: {
  sessionId: string;
}) {
  return await db.$queryRaw<FellowAttendancesTableData[]>`
  SELECT
    f.id AS "fellowId", f.fellow_name AS "fellowName", f.cell_number AS "cellNumber", 
    fa.supervisor_id AS "supervisorId",
    fa.attended AS attended,
    ig.group_name AS "groupName",
    (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating))/4 AS "averageRating"
  FROM fellow_attendances fa
  LEFT JOIN intervention_sessions isess ON fa.session_id = isess.id
  LEFT JOIN fellows f ON fa.fellow_id = f.id
  LEFT JOIN intervention_groups ig ON fa.group_id = ig.id
  LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
  WHERE isess.id = ${sessionId}
  GROUP BY fa.id, f.id, ig.id
  `;
}
