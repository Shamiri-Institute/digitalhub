import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { parse } from "#/lib/middleware/utils";

export default async function AppMiddleware(req: NextRequest) {
  const base = parse(req);
  console.log({ base });
}
