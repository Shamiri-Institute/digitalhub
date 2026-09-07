import { type NextRequest, NextResponse } from "next/server";

import { roleHome } from "#/lib/auth/role-home";
import { getSessionAndUser, sessionCookie } from "#/lib/auth/session";
import { loadSessionUser } from "#/lib/auth/session-user";
import { db } from "#/lib/db";

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

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.has(path)) {
    return NextResponse.next();
  }

  const cookie = sessionCookie();
  const token = request.cookies.get(cookie.name)?.value;
  if (!token) {
    return redirectToLogin(request, path !== "/" ? { next: path } : {});
  }
  // Prefetches run for every visible link; the cookie alone decides those.
  if (request.headers.get("next-router-prefetch") === "1") {
    return NextResponse.next();
  }

  const found = await getSessionAndUser(token);
  if (!found || found.session.expires <= new Date()) {
    return clearCookie(redirectToLogin(request, path !== "/" ? { next: path } : {}));
  }

  const user = await loadSessionUser(found.user.id);
  if (!user?.activeMembership) {
    await db.session.deleteMany({ where: { userId: found.user.id } });
    return clearCookie(
      redirectToLogin(request, { error: "No active membership for this account" }),
    );
  }

  const home = roleHome[user.activeMembership.role];
  if (path === home || path.startsWith(`${home}/`)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(home, request.url));
}

function redirectToLogin(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/login", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

function clearCookie(response: NextResponse) {
  const { name, options } = sessionCookie();
  response.cookies.set(name, "", { ...options, expires: new Date(0) });
  return response;
}
