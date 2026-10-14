import type { Transaction } from "#/db/client";
import { SurveyAuditActor } from "#/db/enums";
import { type JsonValue, surveyAuditEvent } from "#/db/schema";

export const SurveyAuditEntity = {
  SURVEY: "SURVEY",
  SURVEY_VERSION: "SURVEY_VERSION",
} as const;
export type SurveyAuditEntity = (typeof SurveyAuditEntity)[keyof typeof SurveyAuditEntity];

export const SurveyAuditAction = {
  SURVEY_CREATED: "SURVEY_CREATED",
  VERSION_CREATED: "VERSION_CREATED",
} as const;
export type SurveyAuditAction = (typeof SurveyAuditAction)[keyof typeof SurveyAuditAction];

type SurveyEvent = {
  actor:
    | { kind: typeof SurveyAuditActor.USER; userId: string }
    | { kind: typeof SurveyAuditActor.PIPELINE | typeof SurveyAuditActor.SYSTEM };
  surveyId: string;
  entityType: SurveyAuditEntity;
  entityId: string;
  action: SurveyAuditAction;
  before?: JsonValue;
  after?: JsonValue;
  reason?: string;
};

/**
 * Records a change to survey data. Call it inside the transaction that makes the change, so the
 * history and the data commit or roll back together.
 */
export async function recordSurveyEvent(tx: Transaction, event: SurveyEvent) {
  await tx.insert(surveyAuditEvent).values({
    actorKind: event.actor.kind,
    actorUserId: event.actor.kind === SurveyAuditActor.USER ? event.actor.userId : null,
    surveyId: event.surveyId,
    entityType: event.entityType,
    entityId: event.entityId,
    action: event.action,
    before: event.before ?? null,
    after: event.after ?? null,
    reason: event.reason ?? null,
  });
}
