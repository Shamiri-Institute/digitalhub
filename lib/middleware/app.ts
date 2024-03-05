import { ImplementerRole } from "@prisma/client";
import { JWT, getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { parse } from "#/lib/middleware/utils";

export default async function AppMiddleware(req: NextRequest) {
  const { path } = parse(req);
  const session = await getToken({ req });

  // Check if authenticated and accessing authorized route
  if (!session?.email && path !== "/login" && path !== "/register") {
    console.warn(`No email in session`, {
      session,
      pathname: req.nextUrl.pathname,
    });
    return NextResponse.redirect(
      new URL(
        `/login${path !== "/" ? `?next=${encodeURIComponent(path)}` : ""}`,
        req.url,
      ),
    );
  } else if (session?.email) {
    if (path === "/login") {
      if (ifHcUserAndUnprefixedPath(session, path)) {
        return NextResponse.redirect(new URL("/hc", req.url));
      }
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (ifHcUserAndUnprefixedPath(session, path)) {
      return NextResponse.redirect(new URL("/hc", req.url));
    } else if (ifSupervisorAndHcRoute(session, path)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
}

function ifHcUserAndUnprefixedPath(session: JWT | null, path: string) {
  return (
    session?.activeMembership?.role === 'HUB_COORDINATOR' &&
    !path.startsWith("/hc")
  );
}

function ifSupervisorAndHcRoute(session: JWT | null, path: string) {
  return (
    session?.activeMembership?.role === 'SUPERVISOR' &&
    path.startsWith("/hc")
  );
}
