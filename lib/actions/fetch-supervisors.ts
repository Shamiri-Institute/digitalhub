"use server";

import { Prisma } from "@prisma/client";

import { db } from "#/lib/db";

export async function fetchSupervisors({
  where,
}: {
  where: Prisma.SupervisorWhereInput;
}) {
  return await db.supervisor.findMany({
    where,
    include: {
      fellows: {
        include: {
          students: true,
        },
      },
    },
  });
}

export async function fetchSupervisorAttendances({
  where,
}: {
  where: Prisma.SupervisorWhereInput;
}) {
  return await db.supervisor.findMany({
    where,
    include: {
      fellows: {
        include: {
          students: true,
          fellowAttendances: true,
        },
      },
      supervisorAttendances: true,
      assignedSchools: true,
    },
  });
}
