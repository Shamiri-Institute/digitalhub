import type { NextRequest } from "next/server";

import AppMiddleware from "#/lib/middleware/app";

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

export default function proxy(request: NextRequest) {
  return AppMiddleware(request);
}
