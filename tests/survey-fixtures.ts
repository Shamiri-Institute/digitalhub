import { db } from "#/db/client";
import type { SurveyVersionPrefill } from "#/db/enums";
import { survey, surveyVersion } from "#/db/schema";
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
 * A survey whose v1 is published, written straight to the DB the way the publish action writes it,
 * so the survey is active and v1 has its print layout. The caller deletes the survey by its code
 * afterwards, which removes its versions, print runs, copies and pages with it.
 */
export async function createPublishedSurvey({
  code,
  implementerId,
  projectId,
  createdBy,
  prefill = "NONE",
  form = TWO_QUESTIONS,
}: {
  code: string;
  implementerId: string;
  projectId: string;
  createdBy: string;
  prefill?: SurveyVersionPrefill;
  form?: SurveyForm;
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
  const [version] = await db
    .insert(surveyVersion)
    .values({ surveyId: created.id, versionNumber: 1, createdBy, form })
    .returning();
  if (!version) throw new Error("The version was not created");
  const publishable = checkPublish(form, [], prefill);
  if (!publishable.ok) throw new Error(`The form can't be published with prefill ${prefill}`);
  await db.transaction((tx) =>
    storePublished(tx, {
      version,
      form: publishable.form,
      layout: publishable.layout,
      userId: createdBy,
    }),
  );
  return {
    id: created.id,
    code,
    title: created.title,
    versionId: version.id,
    pageCount: publishable.layout.pages.length,
  };
}
