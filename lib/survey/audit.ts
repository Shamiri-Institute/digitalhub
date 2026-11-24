import type { Transaction } from "#/db/client";
import { SurveyAuditActor } from "#/db/enums";
import { type JsonValue, surveyAuditEvent } from "#/db/schema";

export const SurveyAuditEntity = {
  SURVEY: "SURVEY",
  SURVEY_VERSION: "SURVEY_VERSION",
  PRINT_RUN: "PRINT_RUN",
  QUESTIONNAIRE: "QUESTIONNAIRE",
  SCAN_UPLOAD: "SCAN_UPLOAD",
  SCAN_PAGE: "SCAN_PAGE",
} as const;
export type SurveyAuditEntity = (typeof SurveyAuditEntity)[keyof typeof SurveyAuditEntity];

export const SurveyAuditAction = {
  SURVEY_CREATED: "SURVEY_CREATED",
  VERSION_CREATED: "VERSION_CREATED",
  FORM_SAVED: "FORM_SAVED",
  VERSION_PUBLISHED: "VERSION_PUBLISHED",
  SURVEY_ACTIVATED: "SURVEY_ACTIVATED",
  PRINT_RUN_CREATED: "PRINT_RUN_CREATED",
  QUESTIONNAIRE_VOIDED: "QUESTIONNAIRE_VOIDED",
  SCAN_UPLOADED: "SCAN_UPLOADED",
  SCAN_PAGE_INGESTED: "SCAN_PAGE_INGESTED",
  SCAN_STATUS_REPORTED: "SCAN_STATUS_REPORTED",
  SCAN_QUEUED: "SCAN_QUEUED",
  SCAN_RERUN: "SCAN_RERUN",
} as const;
export type SurveyAuditAction = (typeof SurveyAuditAction)[keyof typeof SurveyAuditAction];

type SurveyEvent = {
  actor:
    | { kind: typeof SurveyAuditActor.USER; userId: string }
    | { kind: typeof SurveyAuditActor.PIPELINE | typeof SurveyAuditActor.SYSTEM };
  entityId: string;
  action: SurveyAuditAction;
  before?: JsonValue;
  after?: JsonValue;
  reason?: string;
} & (
  | {
      entityType: Exclude<
        SurveyAuditEntity,
        typeof SurveyAuditEntity.SCAN_UPLOAD | typeof SurveyAuditEntity.SCAN_PAGE
      >;
      surveyId: string;
    }
  // An upload's pages aren't matched to a survey yet.
  | { entityType: typeof SurveyAuditEntity.SCAN_UPLOAD; surveyId?: undefined }
  | { entityType: typeof SurveyAuditEntity.SCAN_PAGE; surveyId: string | undefined }
);

/**
 * Records a change to survey data. Call it inside the transaction that makes the change, so the
 * history and the data commit or roll back together.
 */
export async function recordSurveyEvent(tx: Transaction, event: SurveyEvent) {
  await recordSurveyEvents(tx, [event]);
}

export async function recordSurveyEvents(tx: Transaction, events: readonly SurveyEvent[]) {
  if (events.length === 0) {
    return;
  }
  await tx.insert(surveyAuditEvent).values(
    events.map((event) => ({
      actorKind: event.actor.kind,
      actorUserId: event.actor.kind === SurveyAuditActor.USER ? event.actor.userId : null,
      surveyId: event.surveyId ?? null,
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      before: event.before ?? null,
      after: event.after ?? null,
      reason: event.reason ?? null,
    })),
  );
}
