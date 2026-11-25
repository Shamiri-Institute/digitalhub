import { expect, type Page } from "@playwright/test";

import { cellUnder, getUrl, searchRows } from "#/tests/pages/helpers";

/** Opens the ticket called `subject` from the list at `path`, and returns the ticket's page. */
export async function openTicket(page: Page, path: string, subject: string) {
  await page.goto(getUrl(path));
  await (await searchRows(page, subject)).getByRole("link", { name: subject, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: subject })).toBeVisible();
  return ticketPage(page);
}

/** The ticket's own content, where the holder's next step and the creator's actions both live. */
export function ticketPage(page: Page) {
  return page.getByRole("main");
}

export function activity(page: Page) {
  return page.getByRole("list", { name: "Activity" });
}

/** Opens `action`'s form in the next-step column and writes `reason`, without submitting it. */
export async function fillAction(page: Page, action: string, reason: string) {
  await ticketPage(page).getByRole("button", { name: action, exact: true }).click();
  const form = page.getByRole("form", { name: action });
  await form.getByLabel("Reason").fill(reason);
  return form;
}

export async function submitAction(page: Page, action: string) {
  const form = page.getByRole("form", { name: action });
  await form.getByRole("button", { name: action, exact: true }).click();
  await expect(form).toBeHidden();
}

export async function takeAction(page: Page, action: string, reason: string) {
  await fillAction(page, action, reason);
  await submitAction(page, action);
}

export async function createTicket(
  page: Page,
  path: string,
  subject: string,
  category: string,
  assignee?: string,
) {
  await page.goto(getUrl(path));
  await page.getByRole("button", { name: "New ticket" }).click();
  const dialog = page.getByRole("dialog", { name: "Create new ticket" });
  await dialog.getByPlaceholder("Enter ticket subject").fill(subject);
  await dialog.getByPlaceholder("Describe the issue").fill("Raised by the ticket specs.");
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: category, exact: true }).click();
  if (assignee) {
    await dialog.getByRole("button", { name: "Assign to" }).click();
    await page.getByPlaceholder("Search by name").fill(assignee);
    await page.getByRole("option", { name: assignee }).click();
  }
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog).toBeHidden();
}

export async function heldBy(page: Page, path: string, subject: string) {
  await page.goto(getUrl(path));
  return cellUnder(page, await searchRows(page, subject), "Held by");
}
