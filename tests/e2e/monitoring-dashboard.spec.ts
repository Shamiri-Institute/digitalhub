import { expect, type Page, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { emailForProfile, required, signInWithEmail, signableMember } from "#/tests/helpers";

type RoleFixture = {
  profileId: string;
  hubName: string;
  supervisorName: string;
  sameHubSupervisorId: string;
  sameHubSupervisorName: string;
  sameHubFellowId: string;
  sameHubFellowName: string;
  otherHubSupervisorId: string;
  otherHubSupervisorName: string;
};

async function pickFixture(role: "SUPERVISOR" | "HUB_COORDINATOR") {
  const profileColumn = role === "SUPERVISOR" ? sql`viewer.id` : sql`coordinator.id`;
  const coordinatorJoin =
    role === "SUPERVISOR"
      ? sql``
      : sql`join hub_coordinators coordinator on coordinator.assigned_hub_id = viewer.hub_id`;
  const {
    rows: [fixture],
  } = await db.execute<RoleFixture>(sql`
    select ${profileColumn} as "profileId", h.hub_name as "hubName",
      viewer.supervisor_name as "supervisorName",
      peer.id as "sameHubSupervisorId", peer.supervisor_name as "sameHubSupervisorName",
      f.id as "sameHubFellowId", f.fellow_name as "sameHubFellowName",
      outsider.id as "otherHubSupervisorId", outsider.supervisor_name as "otherHubSupervisorName"
    from supervisors viewer
    join hubs h on h.id = viewer.hub_id
    ${coordinatorJoin}
    join implementer_members m on m.identifier = ${profileColumn} and m.role = ${role}
      and ${signableMember()}
    join supervisors peer on peer.hub_id = viewer.hub_id and peer.id <> viewer.id
      and peer.archived_at is null and peer.supervisor_name is not null
    join fellows f on f.supervisor_id = peer.id and f.hub_id = viewer.hub_id
      and f.archived_at is null and f.fellow_name is not null
    join supervisors outsider on outsider.hub_id <> viewer.hub_id
      and outsider.archived_at is null and outsider.supervisor_name is not null
      and not exists (select 1 from supervisors same_name
        where same_name.hub_id = viewer.hub_id
          and same_name.supervisor_name = outsider.supervisor_name)
    where viewer.archived_at is null and viewer.supervisor_name is not null
    order by viewer.id, peer.id, f.id, outsider.id
    limit 1`);
  required(fixture, `a ${role} whose hub has two supervisors`);
  const email = await emailForProfile(fixture.profileId, role);
  required(email, `the user behind the ${role}`);
  return { fixture, email };
}

async function expectEveryTabLoads(page: Page) {
  const tabLinks = page.getByRole("navigation", { name: "Dashboard tabs" }).getByRole("link");
  await expect(tabLinks).toHaveCount(10);
  const tabCount = await tabLinks.count();
  for (let tabIndex = 0; tabIndex < tabCount; tabIndex += 1) {
    const tabLink = tabLinks.nth(tabIndex);
    await tabLink.click();
    await expect(tabLink).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".animate-pulse")).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText("This card could not load")).toHaveCount(0);
  }
}

test.describe("Monitoring and Evaluation dashboard", () => {
  test.setTimeout(180_000);

  test("a supervisor stays locked to themselves whatever the URL asks for", async ({
    context,
    page,
  }) => {
    const { fixture, email } = await pickFixture("SUPERVISOR");
    await signInWithEmail(context, email);

    await page.goto(
      `/sc/reporting/monitoring-and-evaluation?tab=supervisors&supervisor=${fixture.otherHubSupervisorId}&fellow=${fixture.sameHubFellowId}`,
    );

    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.getByText(fixture.hubName, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(fixture.supervisorName, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Supervisor" })).toHaveCount(0);
    // This fellow belongs to another supervisor, so the id in the URL is ignored.
    await expect(page.getByRole("combobox", { name: "Fellow" })).toHaveText("All");
    await expect(page.getByText(fixture.otherHubSupervisorName)).toHaveCount(0);

    await expectEveryTabLoads(page);
  });

  test("a hub coordinator narrows within their hub and cannot leave it", async ({
    context,
    page,
  }) => {
    const { fixture, email } = await pickFixture("HUB_COORDINATOR");
    await signInWithEmail(context, email);

    await page.goto(
      `/hc/reporting/monitoring-and-evaluation?tab=supervisors&supervisor=${fixture.otherHubSupervisorId}`,
    );

    await expect(page.getByText(fixture.hubName, { exact: true }).first()).toBeVisible();
    const supervisorPicker = page.getByRole("combobox", { name: "Supervisor" });
    await expect(supervisorPicker).toHaveText("All");
    await expect(page.getByText(fixture.otherHubSupervisorName)).toHaveCount(0);

    await supervisorPicker.click();
    await expect(
      page.getByRole("option", { name: fixture.otherHubSupervisorName, exact: true }),
    ).toHaveCount(0);
    await page.getByRole("option", { name: fixture.sameHubSupervisorName, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`supervisor=${fixture.sameHubSupervisorId}`));
    await expect(supervisorPicker).toHaveText(fixture.sameHubSupervisorName);

    await page.reload();
    await expect(supervisorPicker).toHaveText(fixture.sameHubSupervisorName);

    await expectEveryTabLoads(page);
  });
});
