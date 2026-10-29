import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import type { SurveyVersionPrefill } from "#/db/enums";
import { school, student, survey, surveyVersion } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import type { SurveyForm } from "#/lib/survey/form";
import { checkPublish } from "#/lib/survey/publish";
import { storePublished } from "#/lib/survey/store-published";

export const TWO_QUESTIONS: SurveyForm = {
  format: 1,
  pages: [
    {
      items: [
        {
          id: "mood",
          kind: "single_choice",
          key: "mood",
          prompt: "How do you feel today?",
          required: true,
          options: ["1", "2", "3", "4", "5"].map((code) => ({ code, label: code })),
        },
        {
          id: "notes",
          kind: "text",
          key: "notes",
          prompt: "Anything else?",
          required: false,
          lines: 1,
        },
      ],
    },
  ],
};

/** A form of `pageCount` pages with one short question each, which prints one page per form page. */
export function formWithPages(pageCount: number): SurveyForm {
  return {
    format: 1,
    pages: Array.from({ length: pageCount }, (_, index) => ({
      items: [
        {
          id: `q${index + 1}`,
          kind: "text",
          key: `q${index + 1}`,
          prompt: `Question ${index + 1}`,
          required: false,
          lines: 1,
        },
      ],
    })),
  };
}

/**
 * A survey whose v1 (and with `versionCount`, each version after it) is published, written straight
 * to the DB the way the publish action writes it, so the survey is active and every version has its
 * print layout. The caller deletes the survey by its code afterwards, which removes its versions,
 * print runs, copies and pages with it.
 */
export async function createPublishedSurvey({
  code,
  implementerId,
  projectId,
  createdBy,
  prefill = "NONE",
  form = TWO_QUESTIONS,
  versionCount = 1,
}: {
  code: string;
  implementerId: string;
  projectId: string;
  createdBy: string;
  prefill?: SurveyVersionPrefill;
  form?: SurveyForm;
  versionCount?: number;
}) {
  const [created] = await db
    .insert(survey)
    .values({
      implementerId,
      projectId,
      code,
      // The code is unique, so the title is too, even across tests running in parallel.
      title: `Published ${code}`,
      createdBy,
    })
    .returning();
  if (!created) throw new Error("The survey was not created");
  const publishable = checkPublish(form, [], prefill);
  if (!publishable.ok) throw new Error(`The form can't be published with prefill ${prefill}`);
  const versionIds: string[] = [];
  /* oxlint-disable eslint/no-await-in-loop -- each version is published after the one before */
  for (let versionNumber = 1; versionNumber <= versionCount; versionNumber++) {
    const [version] = await db
      .insert(surveyVersion)
      .values({ surveyId: created.id, versionNumber, createdBy, form })
      .returning();
    if (!version) throw new Error("The version was not created");
    await db.transaction((tx) =>
      storePublished(tx, {
        version,
        form: publishable.form,
        layout: publishable.layout,
        userId: createdBy,
      }),
    );
    versionIds.push(version.id);
  }
  /* oxlint-enable eslint/no-await-in-loop */
  const [versionId] = versionIds;
  if (!versionId) throw new Error("No version was published");
  return {
    id: created.id,
    code,
    title: created.title,
    versionId,
    pageCount: publishable.layout.pages.length,
  };
}

/**
 * A school of `hubId` with the named students, for a test to print at, so no other test's run uses
 * it. Copies keep their school and students from being deleted, so `remove` runs after the
 * survey that printed there is deleted.
 */
export async function createPrintSchool({
  hubId,
  schoolName,
  studentNames = [],
}: {
  hubId: string;
  schoolName: string;
  studentNames?: string[];
}) {
  const schoolId = objectId("school");
  await db.insert(school).values({ id: schoolId, schoolName, visibleId: schoolId, hubId });
  const studentRows = studentNames.map((studentName) => {
    const id = objectId("student");
    return { id, studentName, visibleId: id, schoolId };
  });
  if (studentRows.length > 0) {
    await db.insert(student).values(studentRows);
  }
  const remove = async () => {
    await db.delete(student).where(eq(student.schoolId, schoolId));
    await db.delete(school).where(eq(school.id, schoolId));
  };
  return { schoolId, schoolName, remove };
}
