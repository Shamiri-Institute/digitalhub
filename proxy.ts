import { type NextRequest, NextResponse } from "next/server";

import { getSessionAndUser, sessionCookie } from "#/lib/auth/session";

const PUBLIC_PATHS = new Set(["/login", "/register"]);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _vercel (Speed Insights and other Vercel telemetry routes)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|_vercel|favicon.ico).*)",
  ],
};

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (PUBLIC_PATHS.has(path)) {
    return NextResponse.next();
  }

  const { name, options } = sessionCookie();
  const token = request.cookies.get(name)?.value;
  if (token && (await isLiveSession(token))) {
    return NextResponse.next();
  }

  const next = path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
  const response = NextResponse.redirect(new URL(`/login${next}`, request.url));
  if (token) {
    response.cookies.set(name, "", { ...options, expires: new Date(0) });
  }
  return response;
}

async function isLiveSession(sessionToken: string): Promise<boolean> {
  const found = await getSessionAndUser(sessionToken);
  return found !== null && found.session.expires > new Date();
}
