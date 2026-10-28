"use server";

import { refresh } from "next/cache";
import type { z } from "zod";

import { db } from "#/db/client";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { printRunScope, requirePrintRunViewer } from "#/lib/auth/survey-access";
import { type IssuedPrintRun, voidCopy } from "#/lib/survey/print-run";
import {
  fetchPrintableHubs,
  fetchPrintableStudents,
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
  VoidQuestionnaireSchema,
} from "./schemas";

/**
 * Issues a print run: numbered copies of a published version for one hub's schools. A hub
 * coordinator prints for their own hub; a Research admin names any hub of their project. A
 * resubmitted form, whose first reply was lost, answers with the run it already created.
 */
export async function createPrintRun(
  data: z.infer<typeof CreatePrintRunSchema>,
): Promise<ActionResponse<IssuedPrintRun>> {
  try {
    const viewer = await requirePrintRunViewer();
    const input = CreatePrintRunSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const issued = await submitPrintRun(viewer, input.data);
    // On a resubmit too: the first submit's refresh may never have reached this client.
    refresh();
    return { success: true, message: `Created ${copyCount(issued.copyCount)}`, data: issued };
  } catch (error) {
    return failure(error, "Sorry, could not create the print run.");
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
