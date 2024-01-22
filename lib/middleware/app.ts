import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { parse } from "#/lib/middleware/utils";

export default async function AppMiddleware(req: NextRequest) {
  const { path } = parse(req);
  const session = await getToken({ req });
  if (!session?.email && path !== "/login" && path !== "/register") {
    return NextResponse.redirect(
      new URL(
        `/login${path !== "/" ? `?next=${encodeURIComponent(path)}` : ""}`,
        req.url,
      ),
    );
  } else if (session?.email) {
    if (path === "/login" || path === "/register") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
}
