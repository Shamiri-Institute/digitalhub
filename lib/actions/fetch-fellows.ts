"use server";

import type { Prisma } from "@prisma/client";

import { db } from "#/lib/db";

export async function fetchFellows({ where }: { where: Prisma.FellowWhereInput }) {
  return db.fellow.findMany({ where });
}

export async function fetchFellowsWithSupervisor({ where }: { where: Prisma.FellowWhereInput }) {
  return db.fellow.findMany({ where, include: { supervisor: true } });
}
