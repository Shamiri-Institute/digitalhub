"use server";

import { and, asc, eq, max, min } from "drizzle-orm";
import { refresh } from "next/cache";
import type { z } from "zod";

import { db, isUniqueViolation } from "#/db/client";
import { student, surveyPrintRun, surveyQuestionnaire } from "#/db/schema";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { printRunScope, requirePrintRunViewer } from "#/lib/auth/survey-access";
import {
  type IssuedPrintRun,
  isActiveStudent,
  issuePrintRun,
  voidCopy,
} from "#/lib/survey/print-run";
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
  let resubmitted: { printRunId: string; userId: string } | undefined;
  try {
    const viewer = await requirePrintRunViewer();
    const input = CreatePrintRunSchema.safeParse(data);
    if (!input.success) {
      return invalid(input.error);
    }
    const parsed = input.data;
    const scope = await printRunScope(viewer, parsed.hubId);
    resubmitted = { printRunId: parsed.printRunId, userId: scope.userId };

    const issued = await db.transaction((tx) => issuePrintRun(tx, scope, parsed));
    refresh();
    return { success: true, message: `Created ${issued.copyCount} copies`, data: issued };
  } catch (error) {
    if (resubmitted && isUniqueViolation(error, "survey_print_runs_pkey")) {
      return existingRun(resubmitted);
    }
    return failure(error, "Sorry, could not create the print run.");
  }
}

/** The run a resubmitted form created, if this caller created it. */
async function existingRun({
  printRunId,
  userId,
}: {
  printRunId: string;
  userId: string;
}): Promise<ActionResponse<IssuedPrintRun>> {
  const [run] = await db
    .select({
      copyCount: surveyPrintRun.copyCount,
      firstSerial: min(surveyQuestionnaire.serial),
      lastSerial: max(surveyQuestionnaire.serial),
    })
    .from(surveyPrintRun)
    .innerJoin(surveyQuestionnaire, eq(surveyQuestionnaire.printRunId, surveyPrintRun.id))
    .where(and(eq(surveyPrintRun.id, printRunId), eq(surveyPrintRun.requestedBy, userId)))
    .groupBy(surveyPrintRun.id);
  if (!run?.firstSerial || !run.lastSerial) {
    return { success: false, message: "Please reopen the form and try again" };
  }
  // The first submit's refresh may never have reached this client.
  refresh();
  return {
    success: true,
    message: `Created ${run.copyCount} copies`,
    data: {
      printRunId,
      copyCount: run.copyCount,
      firstSerial: run.firstSerial,
      lastSerial: run.lastSerial,
    },
  };
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
      .where(and(eq(student.schoolId, schoolInHub.id), isActiveStudent()))
      .orderBy(asc(student.studentName), asc(student.id));
    return { success: true, message: "", data: students };
  } catch (error) {
    return failure(error, "Sorry, could not load the students.");
  }
}
