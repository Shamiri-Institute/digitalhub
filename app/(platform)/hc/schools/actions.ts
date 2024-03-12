"use server";

import { getCurrentPersonnel } from "#/app/auth";
import { db } from "#/lib/db";

export async function fetchSchoolData(hubId: string) {
  return await db.school.findMany({
    where: {
      hubId
    },
    include: {
      assignedSupervisor: true,
    },
  });
}

export async function fetchChartItems(hubId: string) {
  const dropoutData = await db.$queryRaw<{ name: string, value: number }[]>`
    SELECT
      COUNT(*) AS value,
      dropout_reason AS name
    FROM schools
    WHERE
      dropout_reason IS NOT NULL
      AND hub_id = ${hubId}
    GROUP BY
      dropout_reason
  `

  // necessary loop since prisma returns bigints as the default numeric type 😩
  dropoutData.forEach(data => {
    data.value = Number(data.value)
  })

  return { dropoutData };

  // select count(*), dropout_reason where droppedOut = true group by dropout_reason
  // db.select().from(schools).where(eq(schools.dropoutReason, true)).groupBy(schools.dropoutREason)
}
