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
 * checks that a session cookie exists. PlatformLayout validates the session
 * and enforces the role home using the pathname forwarded here.
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

  const headers = new Headers(request.headers);
  headers.set("x-pathname", path);
  return NextResponse.next({ request: { headers } });
}
