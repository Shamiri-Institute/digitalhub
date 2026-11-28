"use server";

import { refresh } from "next/cache";
import type { z } from "zod";

import { db, isUniqueViolation } from "#/db/client";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { requireSurveyViewer } from "#/lib/auth/survey-access";
import { copyHref } from "#/lib/survey/copy/paths";
import {
  notWaitingMessage,
  placeRefusalMessage,
  placeScanPage as place,
} from "#/lib/survey/scan-pages/place";
import type { ActionResponse } from "#/types/actions.types";
import { failure, invalid } from "./respond";
import { PlaceScanPageSchema } from "./schemas";

/**
 * Why the page left the list, when it did. A refused code leaves it in the list for the viewer to
 * correct.
 */
type LeftTheList =
  | { kind: "placed"; copyHref: string }
  // The page changed since the list was drawn.
  | { kind: "not-waiting" };

/**
 * Places an unidentified scan on the printed page whose code was typed, for a Research admin or
 * the hub coordinator of the hub it was uploaded for.
 */
export async function placeScanPage(
  data: z.infer<typeof PlaceScanPageSchema>,
): Promise<ActionResponse<LeftTheList>> {
  try {
    const viewer = await requireSurveyViewer();
    const input = PlaceScanPageSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const result = await db.transaction((tx) => place(tx, viewer, input.data));
    switch (result.kind) {
      case "placed":
        refresh();
        return {
          success: true,
          message: `Placed on ${result.serial} page ${result.pageNumber}`,
          data: { kind: "placed", copyHref: copyHref(viewer.kind, result.copyId) },
        };
      case "refused":
        return { success: false, message: placeRefusalMessage(result.refusal) };
      case "not-waiting":
        refresh();
        return {
          success: false,
          message: notWaitingMessage(result.because),
          data: { kind: "not-waiting" },
        };
      case "not-found":
        throw new NotFoundError("Scanned page");
      default:
        return result satisfies never;
    }
  } catch (error) {
    // The copy lock keeps two placements of one page apart; the index is the last guard.
    if (isUniqueViolation(error, "survey_scan_pages_one_match_per_page_key")) {
      return {
        success: false,
        message: "Another scan was placed on that page at the same time. Try again.",
      };
    }
    return failure(error, "Sorry, could not place the page.");
  }
}
