"use server";

import { refresh } from "next/cache";
import type { z } from "zod";

import { db, isUniqueViolation } from "#/db/client";
import { requireSurveyViewer } from "#/lib/auth/survey-access";
import { copyHref } from "#/lib/survey/copy/paths";
import {
  placeRefusalMessage,
  placeScanPage as place,
  unavailableMessage,
} from "#/lib/survey/scan-pages/place";
import {
  putScanPageBack as putBack,
  setScanPageAside as setAside,
} from "#/lib/survey/scan-pages/set-aside";
import type { ActionResponse } from "#/types/actions.types";
import { failure, invalid, SCAN_PAGE_GONE_MESSAGE, scanPageMoveResponse } from "./respond";
import { PlaceScanPageSchema, ScanPageIdSchema } from "./schemas";

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
          message: unavailableMessage(result.because),
          data: { kind: "not-waiting" },
        };
      case "not-found":
        refresh();
        return {
          success: false,
          message: SCAN_PAGE_GONE_MESSAGE,
          data: { kind: "not-waiting" },
        };
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

/**
 * Sets aside an unidentified page that is no survey page, for a Research admin or the hub
 * coordinator of the hub it was uploaded for.
 */
export async function setScanPageAside(
  data: z.infer<typeof ScanPageIdSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requireSurveyViewer();
    const input = ScanPageIdSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const result = await db.transaction((tx) => setAside(tx, viewer, input.data));
    return scanPageMoveResponse(result, "Set aside as not a survey page");
  } catch (error) {
    return failure(error, "Sorry, could not set the page aside.");
  }
}

export async function putScanPageBack(
  data: z.infer<typeof ScanPageIdSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requireSurveyViewer();
    const input = ScanPageIdSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const result = await db.transaction((tx) => putBack(tx, viewer, input.data));
    return scanPageMoveResponse(result, "Put back among the pages to place");
  } catch (error) {
    return failure(error, "Sorry, could not put the page back.");
  }
}
