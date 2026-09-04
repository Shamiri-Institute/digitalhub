import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIES = ["__Secure-next-auth.session-token", "next-auth.session-token"];
const PUBLIC_PATHS = new Set(["/login", "/register", "/monitoring"]);

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
