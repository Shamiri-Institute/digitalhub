// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sessionCookieName } from "#/lib/auth/session";
import AppMiddleware from "#/lib/middleware/app";

vi.mock("#/lib/db", () => ({ db: {} }));

function request(path: string, cookie?: string) {
  const headers = cookie ? { cookie } : undefined;
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

describe("AppMiddleware", () => {
  it("redirects to /login with the requested path when no session cookie is present", () => {
    const res = AppMiddleware(request("/hc/schools"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fhc%2Fschools");
  });

  it("redirects the root path to /login without a next parameter", () => {
    const res = AppMiddleware(request("/"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets a request with a session cookie through", () => {
    for (const name of ["next-auth.session-token", "__Secure-next-auth.session-token"]) {
      const res = AppMiddleware(request("/hc/schools", `${name}=abc`));
      expect(res.headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("leaves the public paths open", () => {
    for (const path of ["/login", "/register"]) {
      expect(AppMiddleware(request(path)).headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("protects paths that contain 'monitoring'", () => {
    for (const path of ["/monitoring", "/hc/reporting/monitoring-and-evaluation"]) {
      expect(AppMiddleware(request(path)).status).toBe(307);
    }
  });
});

describe("sessionCookieName", () => {
  const original = { NEXTAUTH_URL: process.env.NEXTAUTH_URL, VERCEL_URL: process.env.VERCEL_URL };

  afterEach(() => {
    process.env.NEXTAUTH_URL = original.NEXTAUTH_URL;
    process.env.VERCEL_URL = original.VERCEL_URL;
  });

  it("uses the plain name over http", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    expect(sessionCookieName()).toBe("next-auth.session-token");
  });

  it("uses the secure-prefixed name over https", () => {
    process.env.NEXTAUTH_URL = "https://hub.example.org";
    expect(sessionCookieName()).toBe("__Secure-next-auth.session-token");
  });

  it("treats a Vercel deployment without NEXTAUTH_URL as https", () => {
    delete process.env.NEXTAUTH_URL;
    process.env.VERCEL_URL = "digitalhub-abc.vercel.app";
    expect(sessionCookieName()).toBe("__Secure-next-auth.session-token");
  });
});
