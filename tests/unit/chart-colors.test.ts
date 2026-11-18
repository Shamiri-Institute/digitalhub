import { describe, expect, test } from "vitest";
import { foldIntoOther, OTHER_COLOR, SERIES_COLORS } from "#/components/charts/constants";

describe("foldIntoOther", () => {
  test("gives each category its own colour while the palette lasts", () => {
    const slices = SERIES_COLORS.map((_, index) => ({ name: `reason ${index}`, value: index }));
    expect(foldIntoOther(slices).map(({ fill }) => fill)).toEqual(SERIES_COLORS);
  });

  test("folds the smallest categories into one grey Other past the palette", () => {
    const slices = Array.from({ length: SERIES_COLORS.length + 3 }, (_, index) => ({
      name: `hub ${index}`,
      value: index + 1,
    }));
    const folded = foldIntoOther(slices);
    const fills = folded.map(({ fill }) => fill);

    expect(folded).toHaveLength(SERIES_COLORS.length);
    expect(new Set(fills).size).toBe(fills.length);
    expect(folded.at(-1)).toEqual({ name: "Other", value: 1 + 2 + 3 + 4, fill: OTHER_COLOR });
    expect(folded.reduce((sum, { value }) => sum + value, 0)).toBe(
      slices.reduce((sum, { value }) => sum + value, 0),
    );
  });
});
