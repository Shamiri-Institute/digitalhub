// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sessionCookieName } from "#/lib/auth/session";
import { db } from "#/lib/db";
import proxy from "#/proxy";

vi.mock("#/lib/db", () => ({ db: { session: { findUnique: vi.fn() } } }));

const findUnique = vi.mocked(db.session.findUnique);
const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000);
const oneHourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

function request(path: string, cookie?: string) {
  const headers = cookie ? { cookie } : undefined;
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

describe("proxy", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("redirects to /login with the requested path when no session cookie is present", async () => {
    const res = await proxy(request("/hc/schools"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fhc%2Fschools");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("redirects the root path to /login without a next parameter", async () => {
    const res = await proxy(request("/"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets a request through when the cookie maps to a live session row", async () => {
    findUnique.mockResolvedValue({ expires: inOneHour() } as never);
    for (const name of ["next-auth.session-token", "__Secure-next-auth.session-token"]) {
      const res = await proxy(request("/hc/schools", `${name}=abc`));
      expect(res.headers.get("x-middleware-next")).toBe("1");
    }
    expect(findUnique).toHaveBeenCalledWith({
      where: { sessionToken: "abc" },
      select: { expires: true },
    });
  });

  it("rejects a cookie with no session row and clears it", async () => {
    findUnique.mockResolvedValue(null);
    const res = await proxy(request("/hc/schools", "next-auth.session-token=forged"));
    expect(res.status).toBe(307);
    expect(res.headers.get("set-cookie")).toContain("next-auth.session-token=;");
  });

  it("rejects an expired session row", async () => {
    findUnique.mockResolvedValue({ expires: oneHourAgo() } as never);
    const res = await proxy(request("/hc/schools", "next-auth.session-token=old"));
    expect(res.status).toBe(307);
  });

  it("leaves the public paths open without touching the database", async () => {
    for (const path of ["/login", "/register"]) {
      const res = await proxy(request(path));
      expect(res.headers.get("x-middleware-next")).toBe("1");
    }
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("protects paths that contain 'monitoring'", async () => {
    for (const path of ["/monitoring", "/hc/reporting/monitoring-and-evaluation"]) {
      const res = await proxy(request(path));
      expect(res.status).toBe(307);
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
