import { NextRequest, NextResponse } from "next/server";

import AppMiddleware from "#/lib/middleware/app";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export default async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes("monitoring")) {
    return NextResponse.next();
  }

  return AppMiddleware(request);
}
