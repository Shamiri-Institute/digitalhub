"use server";

import { Prisma } from "@prisma/client";

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
