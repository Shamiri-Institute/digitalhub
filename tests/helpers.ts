import { Browser } from "@playwright/test";
import path from "node:path";

export async function newSession(
  browser: Browser,
  role: "supervisor" | "hub-coordinator" | "operations",
) {
  const state = path.resolve(__dirname, `./fixtures/${role}-state.json`);
  const context = await browser.newContext({ storageState: state });
  return await context.newPage();
}
