"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import type { z } from "zod";

import { db } from "#/db/client";
import { student } from "#/db/schema";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { printRunScope, requirePrintRunViewer } from "#/lib/auth/survey-access";
import {
  activeStudent,
  type IssuedPrintRun,
  studentPrintOrder,
  voidCopy,
} from "#/lib/survey/print-run";
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
    return { success: true, message: `Created ${issued.copyCount} copies`, data: issued };
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

/** For the student print form: one school's active students, in the order their copies print. */
export async function listPrintableStudents(
  data: z.infer<typeof ListPrintableStudentsSchema>,
): Promise<
  ActionResponse<{ id: string; studentName: string | null; admissionNumber: string | null }[]>
> {
  try {
    const viewer = await requirePrintRunViewer();
    const input = ListPrintableStudentsSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const { hubId: printHubId } = await printRunScope(viewer, input.data.hubId);
    const schoolInHub = await db.query.school.findFirst({
      where: (s, { and, eq, isNull }) =>
        and(eq(s.id, input.data.schoolId), eq(s.hubId, printHubId), isNull(s.archivedAt)),
      columns: { id: true },
    });
    if (!schoolInHub) {
      throw new NotFoundError("School");
    }
    const students = await db
      .select({
        id: student.id,
        studentName: student.studentName,
        admissionNumber: student.admissionNumber,
      })
      .from(student)
      .where(and(eq(student.schoolId, schoolInHub.id), activeStudent()))
      .orderBy(...studentPrintOrder());
    return { success: true, message: "", data: students };
  } catch (error) {
    return failure(error, "Sorry, could not load the students.");
  }
}
