import type { BrowserContext, Page, Response } from "@playwright/test";

import {
  careAdminEmail,
  operationsAdminEmail,
  plainAdminEmail,
  researchAdminEmail,
  superAdminEmail,
} from "#/db/seed/fixtures";
import { expect, test } from "#/tests/fixtures";
import { signInAs, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import type { Role } from "#/tests/platform-routes";

type Viewer = {
  who: string;
  signIn: (context: BrowserContext) => Promise<unknown>;
  home: string;
  tabs: string[];
};

const byRole = (role: Role) => (context: BrowserContext) => signInAs(context, role);
const byEmail = (email: string) => (context: BrowserContext) => signInWithEmail(context, email);

const viewers: Viewer[] = [
  {
    who: "a hub coordinator",
    signIn: byRole("HUB_COORDINATOR"),
    home: "/hc/schedule",
    tabs: ["Schedule", "Schools", "Supervisors", "Fellows", "Students", "Tickets", "Surveys"],
  },
  {
    who: "a supervisor",
    signIn: byRole("SUPERVISOR"),
    home: "/sc/schedule",
    tabs: ["Schedule", "Schools", "Fellows", "Students", "Clinical cases", "Triage", "Tickets"],
  },
  {
    who: "a fellow",
    signIn: byRole("FELLOW"),
    home: "/fel/schedule",
    tabs: ["Schedule", "Schools", "Fellow portal", "Tickets"],
  },
  {
    who: "a clinical lead",
    signIn: byRole("CLINICAL_LEAD"),
    home: "/cl/clinical",
    tabs: ["Supervisors", "Fellows", "Students", "Clinical cases", "Triage", "Tickets"],
  },
  {
    who: "a clinical team member",
    signIn: byRole("CLINICAL_TEAM"),
    home: "/ct/clinical",
    tabs: ["Supervisors", "Fellows", "Students", "Clinical cases"],
  },
  {
    who: "a super admin",
    signIn: byEmail(superAdminEmail),
    home: "/admin/schedule",
    tabs: ["Schedule", "Hubs", "Tickets", "Users", "Surveys", "Reporting"],
  },
  {
    who: "an admin with no team",
    signIn: byEmail(plainAdminEmail),
    home: "/admin/schedule",
    tabs: ["Schedule", "Hubs", "Tickets"],
  },
  {
    who: "a Care team admin",
    signIn: byEmail(careAdminEmail),
    home: "/admin/schedule",
    tabs: ["Schedule", "Hubs", "Tickets"],
  },
  {
    who: "a Research team admin",
    signIn: byEmail(researchAdminEmail),
    home: "/admin/schedule",
    tabs: ["Schedule", "Hubs", "Tickets", "Surveys"],
  },
  {
    who: "an Operations team admin",
    signIn: byEmail(operationsAdminEmail),
    home: "/admin/schedule",
    tabs: ["Schedule", "Hubs", "Tickets", "Reporting"],
  },
];

function mainNav(page: Page) {
  return page.getByRole("navigation", { name: "Main" });
}

// Next prefetches the pages its links point to, so a link to a missing page answers 404.
function recordMissingPages(page: Page) {
  const missing: string[] = [];
  page.on("response", (response: Response) => {
    const url = new URL(response.url());
    if (response.status() === 404 && url.origin === new URL(getUrl("")).origin) {
      missing.push(url.pathname);
    }
  });
  return missing;
}

for (const viewer of viewers) {
  test(`${viewer.who} sees their main navigation, and every link opens a page`, async ({
    page,
    context,
  }) => {
    test.slow();
    await viewer.signIn(context);
    const missing = recordMissingPages(page);
    await page.goto(getUrl("/"));
    await expect(page).toHaveURL(getUrl(viewer.home));

    const links = mainNav(page).getByRole("link");
    await expect(links).toHaveText(viewer.tabs);
    const hrefs = await links.evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    );
    const reporting = mainNav(page).getByRole("button", { name: "Reporting" });
    if ((await reporting.count()) > 0) {
      await reporting.click();
      hrefs.push(
        ...(await page
          .getByRole("menuitem")
          .evaluateAll((items) => items.map((item) => item.getAttribute("href") ?? ""))),
      );
      await page.keyboard.press("Escape");
    }
    for (const href of hrefs) {
      const response = await page.goto(getUrl(href));
      expect(response?.status(), href).toBe(200);
      await expect(mainNav(page)).toBeVisible();
    }
    expect(missing).toEqual([]);
  });
}

test("the admin-wide supervisors, fellows and students pages are gone", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, superAdminEmail);
  for (const path of ["/admin/supervisors", "/admin/fellows", "/admin/students"]) {
    const response = await page.goto(getUrl(path));
    expect(response?.status(), path).toBe(404);
  }
});

test("an Operations team admin who opens an old ops address lands on the admin pages", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, operationsAdminEmail);
  await page.goto(getUrl("/ops/schedule"));
  await expect(page).toHaveURL(getUrl("/admin/schedule"));
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});
