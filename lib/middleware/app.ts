import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIES = ["__Secure-next-auth.session-token", "next-auth.session-token"];
const PUBLIC_PATHS = new Set(["/login", "/register", "/monitoring"]);

/**
 * Sessions live in the database, so the proxy cannot verify one here. It only checks that a
 * session cookie exists. The root page (app/page.tsx) and the role layouts do the real check
 * against the database on every render.
 */
export default function AppMiddleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (PUBLIC_PATHS.has(path)) {
    return NextResponse.next();
  }
  if (SESSION_COOKIES.some((name) => req.cookies.has(name))) {
    return NextResponse.next();
  }

  const next = path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
  return NextResponse.redirect(new URL(`/login${next}`, req.url));
}
