"use server";

import { refresh } from "next/cache";
import type { z } from "zod";

import { db } from "#/db/client";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { printRunScope, requirePrintRunViewer } from "#/lib/auth/survey-access";
import { kickPrintQueue, retryFailedPrintFiles } from "#/lib/survey/print-files";
import { type RecordedPrintRun, voidCopy } from "#/lib/survey/print-run";
import {
  fetchPrintableHubs,
  fetchPrintableStudents,
  fetchPrintRun,
  type PrintableHubs,
  type PrintableStudents,
} from "#/lib/survey/print-run-queries";
import { copyCount } from "#/lib/survey/serial";
import { submitPrintRun } from "#/lib/survey/submit-print-run";
import type { ActionResponse } from "#/types/actions.types";
import { failure, invalid } from "./respond";
import {
  CreatePrintRunSchema,
  ListPrintableStudentsSchema,
  RetryPrintRunSchema,
  VoidQuestionnaireSchema,
} from "./schemas";

/**
 * Makes a print run: numbered copies of a published version for one hub's schools, which the print
 * job then issues and renders a file at a time. A hub coordinator prints for their own hub; a
 * Research admin names any hub of their project. A resubmitted form, whose first reply was lost,
 * answers with the run it already created.
 */
export async function createPrintRun(
  data: z.infer<typeof CreatePrintRunSchema>,
): Promise<ActionResponse<RecordedPrintRun>> {
  try {
    const viewer = await requirePrintRunViewer();
    const input = CreatePrintRunSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const recorded = await submitPrintRun(viewer, input.data);
    // On a resubmit too: the first submit's refresh may never have reached this client.
    refresh();
    kickPrintQueue();
    return { success: true, message: `Created ${copyCount(recorded.copyCount)}`, data: recorded };
  } catch (error) {
    return failure(error, "Sorry, could not create the print run.");
  }
}

/** Queues a run's failed files to render again. */
export async function retryPrintRun(
  data: z.infer<typeof RetryPrintRunSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requirePrintRunViewer();
    const input = RetryPrintRunSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const run = await fetchPrintRun(viewer, input.data.printRunId);
    if (!run) {
      throw new NotFoundError("Print run");
    }
    const queued = await db.transaction((tx) => retryFailedPrintFiles(tx, run.id));
    refresh();
    kickPrintQueue();
    return {
      success: true,
      message:
        queued === 0
          ? "No files had failed"
          : `Trying ${queued === 1 ? "1 file" : `${queued} files`} again`,
    };
  } catch (error) {
    return failure(error, "Sorry, could not try the print run again.");
  }
}

/** Voids a printed copy, with the reason in its history. Voiding it again changes nothing. */
export async function voidQuestionnaire(
  data: z.infer<typeof VoidQuestionnaireSchema>,
): Promise<ActionResponse> {
  try {
    const viewer = await requirePrintRunViewer();
    const input = VoidQuestionnaireSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const outcome = await db.transaction((tx) => voidCopy(tx, viewer, input.data));
    if (outcome === "not-found") {
      throw new NotFoundError("Copy");
    }
    refresh();
    return { success: true, message: "The copy is void" };
  } catch (error) {
    return failure(error, "Sorry, could not void the copy.");
  }
}

/** For the print form, when it opens: the hubs the caller may print for, from their session. */
export async function listPrintableHubs(): Promise<ActionResponse<PrintableHubs>> {
  try {
    const viewer = await requirePrintRunViewer();
    return { success: true, message: "", data: await fetchPrintableHubs(viewer) };
  } catch (error) {
    return failure(error, "Sorry, could not load the hubs.");
  }
}

/** For the student print form: one school's active students, in the order their copies print. */
export async function listPrintableStudents(
  data: z.infer<typeof ListPrintableStudentsSchema>,
): Promise<ActionResponse<PrintableStudents>> {
  try {
    const viewer = await requirePrintRunViewer();
    const input = ListPrintableStudentsSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const { hubId: printHubId } = await printRunScope(viewer, input.data.hubId);
    const students = await fetchPrintableStudents(printHubId, input.data.schoolId);
    if (!students) {
      throw new NotFoundError("School");
    }
    return { success: true, message: "", data: students };
  } catch (error) {
    return failure(error, "Sorry, could not load the students.");
  }
}
