// The print font: Figtree's static Regular, SemiBold and Bold files in public/fonts/figtree. The
// PDF embeds them, the builder preview draws with them, and the layout engine measures with a
// table generated from them, so all three set text the same width.

import type { FontWeight } from "#/lib/survey/text-metrics";

export const PRINT_FONT_FILES = {
  400: "Figtree-Regular.ttf",
  600: "Figtree-SemiBold.ttf",
  700: "Figtree-Bold.ttf",
} as const satisfies Record<FontWeight, string>;

export type PrintFonts = Record<FontWeight, Uint8Array>;

/** Fetches the print fonts from the app's own public files, for a PDF made in the browser. */
export async function loadPrintFontsInBrowser(): Promise<PrintFonts> {
  const load = async (weight: FontWeight) => {
    const response = await fetch(`/fonts/figtree/${PRINT_FONT_FILES[weight]}`);
    if (!response.ok) {
      throw new Error(`Could not load the print font ${PRINT_FONT_FILES[weight]}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  };
  const [regular, semibold, bold] = await Promise.all([load(400), load(600), load(700)]);
  return { 400: regular, 600: semibold, 700: bold };
}
