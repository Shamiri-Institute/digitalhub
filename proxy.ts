import { type NextRequest, NextResponse } from "next/server";

import { sessionCookie } from "#/lib/auth/session";

const PUBLIC_PATHS = new Set(["/login", "/register"]);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _vercel (Speed Insights and other Vercel telemetry routes)
     * - monitoring (Sentry tunnel route, see tunnelRoute in next.config.js)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|_vercel|monitoring|favicon.ico).*)",
  ],
};

/**
 * Routing Middleware runs at the edge, outside the static egress IPs that the
 * RDS security group allows, so it must never touch the database. It only
 * checks that a session cookie exists. The current* helpers in app/auth.ts
 * validate the session and enforce the role home close to the data.
 */
export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.has(path)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(sessionCookie().name)?.value;
  if (!token) {
    const url = new URL("/login", request.url);
    if (path !== "/") {
      url.searchParams.set("next", path);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
