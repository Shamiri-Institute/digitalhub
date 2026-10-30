import { expect, test } from "@playwright/test";

import { getUrl } from "#/tests/pages/helpers";

// app/fonts/figtree.ts declares Figtree in two files: the core every page preloads, and Latin
// Extended-A, which belongs to the same family and loads only for text that needs it.
test("loads the extended Figtree file only once the text needs it", async ({ page }) => {
  const fontPaths: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fontPaths.push(new URL(request.url()).pathname);
  });
  await page.goto(getUrl("/login"));
  await page.evaluate(() => document.fonts.ready);
  expect(fontPaths.filter((path) => path.includes("figtree_semibold"))).toEqual([
    expect.stringContaining("figtree_semibold_600_core"),
  ]);

  const extendedRequest = page.waitForRequest(/figtree_semibold_600_extended/);
  await page.getByTestId("email-input").fill("Łódź");
  await extendedRequest;
  const extendedFace = await page.evaluate(async () => {
    await document.fonts.ready;
    const bodyFamily = getComputedStyle(document.body).fontFamily.split(",")[0]?.trim();
    return [...document.fonts].some(
      (face) =>
        face.family === bodyFamily &&
        face.unicodeRange.includes("U+141") &&
        face.status === "loaded",
    );
  });
  expect(extendedFace).toBe(true);
});
