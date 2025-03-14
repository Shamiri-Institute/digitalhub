"use server";

import { currentFellow } from "#/app/auth";
import { db } from "#/lib/db";

export async function fetchFellowDocuments() {
  const fellow = await currentFellow();
  if (!fellow) {
    throw new Error("Not authenticated");
  }
  return await db.fellowDocuments.findMany({
    where: { fellowId: fellow.id },
    orderBy: { createdAt: "desc" },
  });
}
