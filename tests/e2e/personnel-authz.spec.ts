import { expect, test } from "@playwright/test";

import { generateSessionToken } from "#/tests/helpers";

/**
 * Regression guard for the personnel over-fetch (fetchImplementerPersonnel).
 *
 * The RoleSwitcher is a development-only impersonation helper. It calls the
 * fetchImplementerPersonnel server action to list the people a developer may
 * impersonate. The old action had two holes:
 *   1. It only checked that a session existed, not the caller's role, so any
 *      user received the whole organisation roster (ADMIN included).
 *   2. It read the implementerId from the request body, so a caller could ask
 *      for a DIFFERENT organisation's roster and get it (cross-tenant read).
 *
 * The harness runs in development (NEXT_PUBLIC_ENV=development), where the
 * helper is meant to work, so this test pins the tenant-scoping guarantee: a
 * Fellow who spoofs another organisation's implementerId must still receive
 * only their own organisation's roster. It fails against the old action, which
 * honoured the spoofed id, and passes once the action reads the implementer
 * from the session. The separate production guarantee (the action is refused
 * entirely outside development) is enforced by the same guard.
 */

// A seeded FELLOW whose organisation ("Shamiri Institute") differs in size from
// the organisation we spoof below, so honouring the spoof would change the count.
const FELLOW_EMAIL = "bukayo.saka@test.com";
const OTHER_ORG_IMPLEMENTER_ID = "impl_01m20jmz9afq98qhmvp1d7hmty";

function personnelRoleCount(body: string): number {
  return Array.from(body.matchAll(/"role":"[A-Z_]+"/g)).length;
}

test.describe("Personnel over-fetch guard", () => {
  test("a spoofed implementerId cannot read another organisation's roster", async ({
    page,
    context,
  }) => {
    const token = await generateSessionToken(FELLOW_EMAIL);
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        expires: Math.floor(Date.now() / 1000) + 60 * 60,
      },
    ]);

    // The RoleSwitcher effect fires on mount; capture the real server-action id
    // and request body it sends, rather than hardcoding a build-specific hash.
    let actionId: string | undefined;
    let ownRequestBody: string | undefined;
    let ownRosterCount = 0;

    page.on("response", async (res) => {
      const contentType = res.headers()["content-type"] ?? "";
      if (!contentType.includes("text/x-component") || res.request().method() !== "POST") {
        return;
      }
      let body = "";
      try {
        body = await res.text();
      } catch {
        return;
      }
      if (body.includes('"personnel"')) {
        actionId = res.request().headers()["next-action"];
        ownRequestBody = res.request().postData() ?? undefined;
        ownRosterCount = personnelRoleCount(body);
      }
    });

    await page.goto("/fel/schools", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // In development the helper runs, so we should have captured a real call.
    expect(actionId, "expected the RoleSwitcher to call fetchImplementerPersonnel").toBeTruthy();
    expect(ownRequestBody, "expected to capture the action request body").toBeTruthy();
    expect(ownRosterCount).toBeGreaterThan(0);

    // Replay the same action, but spoof a different organisation's implementerId.
    const spoofed = JSON.parse(ownRequestBody as string) as Array<Record<string, unknown>>;
    spoofed[0] = { ...spoofed[0], implementerId: OTHER_ORG_IMPLEMENTER_ID };

    const spoofedRes = await page.request.post("/fel/schools", {
      headers: {
        "Next-Action": actionId as string,
        "Content-Type": "text/plain;charset=UTF-8",
      },
      data: JSON.stringify(spoofed),
    });
    const spoofedBody = await spoofedRes.text();

    // The response must still be the caller's own roster (same count), not the
    // other organisation's. Honouring the spoof would change the count.
    expect(personnelRoleCount(spoofedBody)).toBe(ownRosterCount);
  });
});
