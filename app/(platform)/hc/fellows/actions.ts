"use server";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow, hub } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { requireHubRole } from "#/lib/auth/require-hub-role";

export type FellowDropoutReasonsGraphData = {
  name: string;
  value: number;
};

export async function fetchFellowDropoutReasons() {
  const { hubId } = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
  const { rows: dropoutData } = await db.execute<FellowDropoutReasonsGraphData>(sql`
    SELECT
      COUNT(*)::int AS value,
      drop_out_reason AS name
    FROM fellows
    WHERE
      drop_out_reason IS NOT NULL
      AND dropped_out = true
      AND hub_id = ${hubId}
    GROUP BY
      drop_out_reason
  `);

  dropoutData.forEach((data) => {
    data.value = Number(data.value);
  });

  return dropoutData;
}

export async function fetchFellowDataCompletenessData() {
  const { hubId } = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
  const {
    rows: [fellowData],
  } = await db.execute<{ percentage: number | null }>(sql`
    SELECT
      AVG((
        (CASE WHEN mpesa_name IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN mpesa_number IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN cell_number IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN hub_id IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN gender IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN id_number IS NOT NULL THEN 1 ELSE 0 END)
      ) / 6.0 * 100)::float8 AS percentage
    FROM fellows
    WHERE hub_id = ${hubId}
  `);

  if (!fellowData) {
    return [];
  }

  const percentage = +Number(fellowData.percentage).toFixed(2);

  return [
    { name: "actual", value: percentage },
    { name: "difference", value: 100 - percentage },
  ];
}

export type FellowSessionRatingAverages = {
  session_date: string;
  behaviour_rating: number;
  program_delivery_rating: number;
  dressing_and_grooming_rating: number;
  punctuality_rating: number;
};

export async function fetchFellowSessionRatingAverages() {
  const { hubId } = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
  const { rows: ratingAverages } = await db.execute<FellowSessionRatingAverages>(sql`
    SELECT
      CONCAT(TRIM(TO_CHAR(wfr.week, 'Month')), ' Week ', EXTRACT(WEEK FROM wfr.week)) AS session_date,
      AVG(wfr.behaviour_rating)::float8 AS behaviour_rating,
      AVG(wfr.program_delivery_rating)::float8 AS program_delivery_rating,
      AVG(wfr.dressing_and_grooming_rating)::float8 AS dressing_and_grooming_rating,
      AVG(wfr.punctuality_rating)::float8 AS punctuality_rating
    FROM weekly_fellow_ratings wfr
    INNER JOIN supervisors AS sup ON wfr.supervisor_id = sup.id
    WHERE
      sup.hub_id = ${hubId}
    GROUP BY
    wfr.week
    ORDER BY
    wfr.week
  `);

  if (!ratingAverages.length) {
    return [];
  }

  ratingAverages.forEach((item) => {
    item.behaviour_rating = Math.round(Number(item.behaviour_rating)) || 0;
    item.program_delivery_rating = Math.round(Number(item.program_delivery_rating)) || 0;
    item.dressing_and_grooming_rating = Math.round(Number(item.dressing_and_grooming_rating)) || 0;
    item.punctuality_rating = Math.round(Number(item.punctuality_rating)) || 0;
  });

  return ratingAverages;
}

/**
 * The fellows the caller may see: a hub coordinator sees their hub, an admin their implementer's
 * fellows in the active project, the same as the fellows pages list.
 */
async function callerFellowFilter() {
  const { role, implementerId } = await requireAuthRole(
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.ADMIN,
  );
  if (role === ImplementerRole.ADMIN) {
    const activeProjectHubIds = db
      .select({ id: hub.id })
      .from(hub)
      .where(eq(hub.projectId, await getActiveProjectId()));
    return and(eq(fellow.implementerId, implementerId), inArray(fellow.hubId, activeProjectHubIds));
  }
  const { hubId } = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
  return eq(fellow.hubId, hubId);
}

export async function loadFellowPersonalDetails(fellowId: string) {
  const [personalDetails] = await db
    .select({
      idNumber: fellow.idNumber,
      dateOfBirth: fellow.dateOfBirth,
      mpesaName: fellow.mpesaName,
      mpesaNumber: fellow.mpesaNumber,
    })
    .from(fellow)
    .where(and(eq(fellow.id, fellowId), await callerFellowFilter()));
  if (!personalDetails) {
    throw new Error("Fellow not found");
  }
  return personalDetails;
}

export type FellowPersonalDetails = Awaited<ReturnType<typeof loadFellowPersonalDetails>>;

export async function loadFellowWeeklyEvaluations(fellowId: string) {
  const fellowInScope = db
    .select({ id: fellow.id })
    .from(fellow)
    .where(and(eq(fellow.id, fellowId), await callerFellowFilter()));
  return db.query.weeklyFellowRatings.findMany({
    where: (r, { inArray }) => inArray(r.fellowId, fellowInScope),
    orderBy: (r, { asc }) => [asc(r.week), asc(r.id)],
  });
}
