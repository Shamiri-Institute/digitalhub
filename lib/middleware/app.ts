import { type NextRequest, NextResponse } from "next/server";

import { db } from "#/lib/db";

const SESSION_COOKIES = ["__Secure-next-auth.session-token", "next-auth.session-token"];
const PUBLIC_PATHS = new Set(["/login", "/register"]);

export default async function AppMiddleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (PUBLIC_PATHS.has(path)) {
    return NextResponse.next();
  }

  const cookie = SESSION_COOKIES.map((name) => req.cookies.get(name)).find(Boolean);
  if (cookie && (await isLiveSession(cookie.value))) {
    return NextResponse.next();
  }

  const next = path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
  const response = NextResponse.redirect(new URL(`/login${next}`, req.url));
  if (cookie) {
    response.cookies.set(cookie.name, "", {
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: cookie.name.startsWith("__Secure-"),
    });
  }
  return response;
}

async function isLiveSession(sessionToken: string): Promise<boolean> {
  const session = await db.session.findUnique({
    where: { sessionToken },
    select: { expires: true },
  });
  return session !== null && session.expires > new Date();
}
