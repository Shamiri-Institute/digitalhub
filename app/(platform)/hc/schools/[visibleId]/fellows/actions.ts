"use server";

import { SchoolFellowTableData } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/columns";
import { db } from "#/lib/db";

export async function fetchFellowsWithRatings(visibleId: string) {
  const school = await db.school.findFirstOrThrow({
    where: {
      visibleId,
    },
  });

  return await db.$queryRaw<SchoolFellowTableData[]>`
      SELECT
        f.id, 
        f.fellow_name as "fellowName", 
        f.cell_number as "cellNumber", 
        f.supervisor_id as "supervisorId",
        sup.supervisor_name as "supervisorName", 
        f.dropped_out as "droppedOut", 
        ig.group_name as "groupName",
        (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating))/4 AS "averageRating"
      FROM fellows f
      LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
      LEFT JOIN supervisors sup ON f.supervisor_id = sup.id
      LEFT JOIN 
        (SELECT _ig.* FROM intervention_groups _ig WHERE _ig.school_id = ${school.id}) ig 
        ON f.id = ig.leader_id
      WHERE f.hub_id = ${school.hubId}
      GROUP BY f.id, ig.group_name, sup.supervisor_name
  `;
}

export async function assignFellowSupervisor({
  fellowId,
  supervisorId,
}: {
  fellowId: string;
  supervisorId: string;
}) {
  try {
    const result = await db.fellow.update({
      where: {
        id: fellowId,
      },
      data: {
        supervisorId,
      },
      include: {
        supervisor: true,
      },
    });
    return {
      success: true,
      message: `Successfully assigned ${result.supervisor ? result.supervisor.supervisorName : "supervisor"} to ${result.fellowName}.`,
    };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong assigning a supervisor" };
  }
}
