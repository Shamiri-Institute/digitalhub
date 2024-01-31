"use server";

import { Prisma } from "@prisma/client";

import { db } from "#/lib/db";

export async function fetchFellows({
  where,
}: {
  where: Prisma.FellowWhereInput;
}) {
  return db.fellow.findMany({ where });
}
