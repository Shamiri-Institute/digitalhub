"use server";

import { currentAdminUser } from "#/app/auth";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";

export async function fetchImplementerStats(implementerId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }
  
  try {
    const stats = await db.$queryRaw<
      {
        hub_count: number;
        school_count: number;
        student_count: number;
      }[]
    >`SELECT
      COUNT(DISTINCT h.id) AS hub_count,
      COUNT(DISTINCT sch.id) AS school_count,
      COUNT(DISTINCT stu.id) AS student_count
    FROM
      hubs h
      LEFT JOIN schools sch ON h.id = sch.hub_id
      LEFT JOIN students stu ON sch.id = stu.school_id
    WHERE
      h.implementer_id = ${implementerId}`;

    return { success: true, data: stats[0] };
  } catch (error) {
    console.error("Error fetching implementer stats:", error);
    return { success: false, message: "Error fetching implementer stats"};
  }
}

export async function fetchImplementerSessionTypes(implementerId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

  try {
    const sessionTypes = await db.sessionName.findMany({
      where: {
        hub: {
          implementerId: implementerId
        }
      },
      distinct: ['sessionName']
    });

    return { success: true, data: sessionTypes };
  } catch (error) {
    console.error("Error fetching implementer session types:", error);
    return { success: false, message: "Error fetching implementer session types" };
  }
} 