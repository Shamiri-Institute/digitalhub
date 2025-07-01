"use server";

import type { Prisma } from "@prisma/client";

import { db } from "#/lib/db";

export async function fetchFellowAttendances({
  where,
}: {
  where: Prisma.FellowAttendanceWhereInput;
}) {
  const attendances = await db.fellowAttendance.findMany({
    where,
    include: {
      session: true,
    },
  });

  return attendances;
}
