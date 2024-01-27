"use server";

import { db } from "#/lib/db";

export async function fetchSchools({ hubId }: { hubId: string }) {
  const schools = await db.school.findMany({
    where: { hubId },
  });

  return schools;
}
