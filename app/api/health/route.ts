import { sql } from "drizzle-orm";

import { db } from "#/db/client";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    return Response.json({ status: "ok" }, { headers: NO_STORE });
  } catch {
    return Response.json({ status: "error" }, { status: 503, headers: NO_STORE });
  }
}
