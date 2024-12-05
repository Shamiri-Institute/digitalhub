"use server";

import { Filters } from "#/app/(platform)/hc/schedule/context/filters-context";
import { FellowAttendancesTableData } from "#/components/common/fellow/fellow-attendance";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";

export async function fetchSessionFellowAttendances({
  sessionId,
}: {
  sessionId?: string;
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

export async function fetchDayFellowAttendances({
  hubId,
  start,
  end,
  filters,
}: {
  hubId: string;
  start: Date;
  end: Date;
  filters: Filters;
}) {
  const sessionTypes = Object.keys(filters.sessionTypes).filter(
    (sessionType) => {
      return filters.sessionTypes[sessionType];
    },
  );

  const statusTypes = Object.keys(filters.statusTypes).filter((status) => {
    return filters.statusTypes[status];
  });

  return await db.$queryRaw<FellowAttendancesTableData[]>`
  SELECT
    f.id AS "fellowId", f.fellow_name AS "fellowName", f.cell_number AS "cellNumber", 
    fa.supervisor_id AS "supervisorId",fa.session_id AS "sessionId", sup.supervisor_name AS "supervisorName",
    sch.school_name AS "schoolName",
    fa.attended,
    ig.group_name AS "groupName", isess.session_type AS "sessionType", isess.occurred, isess.session_date AS "sessionDate", isess.status AS "sessionStatus",
    (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating))/4 AS "averageRating"
  FROM fellow_attendances fa
  LEFT JOIN intervention_sessions isess ON fa.session_id = isess.id
  LEFT JOIN fellows f ON fa.fellow_id = f.id
  LEFT JOIN supervisors sup ON fa.supervisor_id = sup.id
  LEFT JOIN schools sch ON fa.school_id = sch.id
  LEFT JOIN intervention_groups ig ON fa.group_id = ig.id
  LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
  WHERE isess.session_date > ${start} 
  AND isess.session_date < ${end} 
  AND f.hub_id = ${hubId}
  AND isess.session_type IN (${Prisma.join(sessionTypes)})
  AND isess.status::text = ANY (ARRAY[${statusTypes.length > 0 ? Prisma.join(statusTypes) : ""}])
  GROUP BY fa.id, f.id, ig.id, isess.session_date, sup.supervisor_name, sch.school_name, isess.session_type, isess.occurred, isess.status, isess.session_date
  `;
}
