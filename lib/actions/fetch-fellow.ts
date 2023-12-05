import { db } from "#/lib/db";

export async function fetchFellow(visibleId: string) {
  return await db.fellow.findUnique({ where: { visibleId } });
}
