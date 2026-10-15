import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { ticketEscalations, ticketReassignments, ticketResolutions, tickets } from "#/db/schema";
import { signInAs } from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

const subject = `E2E ticket ${Date.now()}`;

test.afterAll(async () => {
  const created = db.select({ id: tickets.id }).from(tickets).where(eq(tickets.subject, subject));
  await db.delete(ticketEscalations).where(inArray(ticketEscalations.ticketId, created));
  await db.delete(ticketReassignments).where(inArray(ticketReassignments.ticketId, created));
  await db.delete(ticketResolutions).where(inArray(ticketResolutions.ticketId, created));
  await db.delete(tickets).where(eq(tickets.subject, subject));
});

test("supervisor creates a ticket and can view it in the list", async ({ page, context }) => {
  await signInAs(context, "SUPERVISOR");

  await page.goto(getUrl("/sc/tickets"));
  await page.getByRole("button", { name: "New ticket" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Enter ticket subject").fill(subject);
  await dialog.getByPlaceholder("Describe the issue").fill("Raised by the Playwright ticket flow.");
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "TECH" }).click();
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog).toBeHidden();

  const row = await searchRows(page, subject);
  await expect(row).toBeVisible();
  // The table lowercases these through CSS, so innerText does not match the stored value.
  await expect(row).toContainText(/tech/i);
  await expect(row).toContainText(/medium/i);

  await chooseRowAction(page, row, "View ticket");
  await expect(page.getByRole("dialog")).toContainText(subject);
});
