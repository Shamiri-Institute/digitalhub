"use server";

import { refresh } from "next/cache";
import type { z } from "zod";

import { requireSurveyViewer, surveyHubScope } from "#/lib/auth/survey-access";
import {
  finishScanUpload as finishUpload,
  type StartedScanUpload,
  startScanUpload as startUpload,
} from "#/lib/survey/scan-uploads";
import type { ActionResponse } from "#/types/actions.types";
import { failure, invalid } from "./respond";
import { FinishScanUploadSchema, StartScanUploadSchema } from "./schemas";

/**
 * Starts uploading a scanned file: refuses one that is already uploaded, before any bytes move, and
 * answers with the URL to PUT it to. A hub coordinator uploads for their own hub; a Research admin
 * names any hub of their project.
 */
export async function startScanUpload(
  data: z.infer<typeof StartScanUploadSchema>,
): Promise<ActionResponse<StartedScanUpload>> {
  try {
    const viewer = await requireSurveyViewer();
    const input = StartScanUploadSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const { hubId: requestedHubId, ...file } = input.data;
    const scope = await surveyHubScope(viewer, requestedHubId);
    return { success: true, message: "Uploading", data: await startUpload(scope, file) };
  } catch (error) {
    return failure(error, "Sorry, could not start the upload.");
  }
}

/** Records a scanned file once its PUT has finished. */
export async function finishScanUpload(
  data: z.infer<typeof FinishScanUploadSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requireSurveyViewer();
    const input = FinishScanUploadSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const uploaded = await finishUpload(viewer, input.data.uploadId);
    refresh();
    return { success: true, message: `Uploaded ${uploaded.fileName}` };
  } catch (error) {
    return failure(error, "Sorry, could not save the upload.");
  }
}
