import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

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
  const token = await getToken({ req: request });

  return AppMiddleware(request);
}
