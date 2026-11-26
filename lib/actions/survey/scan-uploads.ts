"use server";

import { refresh } from "next/cache";
import type { z } from "zod";

import { requireSurveyScope } from "#/lib/auth/admin-access";
import { requireSurveyViewer, surveyHubScope } from "#/lib/auth/survey-access";
import { rerunScanUpload as rerunUpload } from "#/lib/survey/pipeline-jobs";
import { notifyPipelineSoon } from "#/lib/survey/pipeline-notify";
import {
  finishScanUpload as finishUpload,
  keepScanUploadHeld as keepHeld,
  releaseScanUpload as releaseUpload,
  type StartedScanUpload,
  startScanUpload as startUpload,
} from "#/lib/survey/scan-uploads";
import type { ActionResponse } from "#/types/actions.types";
import { failure, invalid } from "./respond";
import { ScanUploadSchema, StartScanUploadSchema } from "./schemas";

/**
 * Starts uploading a scanned file: refuses one that is already uploaded, before any bytes move, and
 * answers with the URL to PUT it to. A hub coordinator uploads for their own hub; a Research admin
 * names any hub of their project. It doesn't refresh(): the row it writes is unfinished, and no
 * page shows those.
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

export async function finishScanUpload(
  data: z.infer<typeof ScanUploadSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requireSurveyViewer();
    const input = ScanUploadSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const uploaded = await finishUpload(viewer, input.data.uploadId);
    notifyPipelineSoon(input.data.uploadId);
    refresh();
    return { success: true, message: `Uploaded ${uploaded.fileName}` };
  } catch (error) {
    return failure(error, "Sorry, could not save the upload.");
  }
}

/** Keeps an unfinished upload the caller's while its file is still being sent. */
export async function keepScanUploadHeld(
  data: z.infer<typeof ScanUploadSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requireSurveyViewer();
    const input = ScanUploadSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    await keepHeld(viewer, input.data.uploadId);
    return { success: true, message: "Still uploading" };
  } catch (error) {
    return failure(error, "Sorry, could not keep the upload going.");
  }
}

/**
 * Gives up an upload its uploader cancelled, so the file is free to send again. Like
 * startScanUpload, it doesn't refresh(): no page shows the row it deletes.
 */
export async function cancelScanUpload(
  data: z.infer<typeof ScanUploadSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requireSurveyViewer();
    const input = ScanUploadSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    await releaseUpload(viewer, input.data.uploadId);
    return { success: true, message: "Cancelled" };
  } catch (error) {
    return failure(error, "Sorry, could not cancel the upload.");
  }
}

/**
 * Runs a failed or stuck upload again, as its next attempt. Research admins only: a hub
 * coordinator sees the upload's status but can't restart the pipeline.
 */
export async function rerunScanUpload(
  data: z.infer<typeof ScanUploadSchema>,
): Promise<ActionResponse> {
  try {
    const scope = await requireSurveyScope();
    const input = ScanUploadSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const rerun = await rerunUpload(scope, input.data.uploadId);
    notifyPipelineSoon(input.data.uploadId);
    refresh();
    return { success: true, message: `Running ${rerun.fileName} again (attempt ${rerun.attempt})` };
  } catch (error) {
    return failure(error, "Sorry, could not run the upload again.");
  }
}
