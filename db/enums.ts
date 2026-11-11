// Plain objects so client components can import them; db/schema.ts builds the pgEnums from these.

export function enumValues<T extends Record<string, string>>(e: T) {
  return Object.values(e) as [T[keyof T], ...T[keyof T][]];
}

export const ImplementerRole = {
  ADMIN: "ADMIN",
  HUB_COORDINATOR: "HUB_COORDINATOR",
  SUPERVISOR: "SUPERVISOR",
  OPERATIONS: "OPERATIONS",
  FELLOW: "FELLOW",
  CLINICAL_LEAD: "CLINICAL_LEAD",
  CLINICAL_TEAM: "CLINICAL_TEAM",
} as const;
export type ImplementerRole = (typeof ImplementerRole)[keyof typeof ImplementerRole];

export const AdminTeam = {
  CARE: "CARE",
  RESEARCH: "RESEARCH",
  OPERATIONS: "OPERATIONS",
} as const;
export type AdminTeam = (typeof AdminTeam)[keyof typeof AdminTeam];

export const TEAM_LABELS: Record<AdminTeam, string> = {
  CARE: "Care",
  RESEARCH: "Research",
  OPERATIONS: "Operations",
};

export const ApprovalStatus = {
  PENDING: "PENDING",
  REJECTED: "REJECTED",
  APPROVED: "APPROVED",
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const QuestionnaireType = {
  QA: "QA",
  JSS: "JSS",
} as const;
export type QuestionnaireType = (typeof QuestionnaireType)[keyof typeof QuestionnaireType];

export const RiskScreenOutcome = {
  ALL_NO: "ALL_NO",
  ANY_YES: "ANY_YES",
  NOT_COMPLETED: "NOT_COMPLETED",
} as const;
export type RiskScreenOutcome = (typeof RiskScreenOutcome)[keyof typeof RiskScreenOutcome];

export const RiskNotCompletedReason = {
  STUDENT_LEFT: "STUDENT_LEFT",
  NO_PRIVACY: "NO_PRIVACY",
  TIME_CONSTRAINTS: "TIME_CONSTRAINTS",
  OTHER: "OTHER",
} as const;
export type RiskNotCompletedReason =
  (typeof RiskNotCompletedReason)[keyof typeof RiskNotCompletedReason];

export const TriageActionTaken = {
  SUPPORTED: "SUPPORTED",
  REFERRED: "REFERRED",
  ESCALATED: "ESCALATED",
  REFUSED: "REFUSED",
  INTERRUPTED: "INTERRUPTED",
} as const;
export type TriageActionTaken = (typeof TriageActionTaken)[keyof typeof TriageActionTaken];

export const SupervisorHandoffStatus = {
  WARM_HANDOFF: "WARM_HANDOFF",
  SUPERVISOR_NOTIFIED: "SUPERVISOR_NOTIFIED",
  COULD_NOT_REACH: "COULD_NOT_REACH",
  STUDENT_REFUSED_NOTIFIED: "STUDENT_REFUSED_NOTIFIED",
} as const;
export type SupervisorHandoffStatus =
  (typeof SupervisorHandoffStatus)[keyof typeof SupervisorHandoffStatus];

export const SessionStatus = {
  Scheduled: "Scheduled",
  Rescheduled: "Rescheduled",
  Cancelled: "Cancelled",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const GroupType = {
  TREATMENT: "TREATMENT",
  CONTROL: "CONTROL",
} as const;
export type GroupType = (typeof GroupType)[keyof typeof GroupType];

export const AdaptationType = {
  CONTENT: "CONTENT",
  PACING: "PACING",
  LANGUAGE: "LANGUAGE",
  FORMAT: "FORMAT",
  OTHER: "OTHER",
} as const;
export type AdaptationType = (typeof AdaptationType)[keyof typeof AdaptationType];

export const SupportType = {
  TRAINING: "TRAINING",
  CHECK_INS: "CHECK_INS",
  MATERIALS: "MATERIALS",
  PEER_SUPPORT: "PEER_SUPPORT",
  SUFFICIENT: "SUFFICIENT",
  OTHER: "OTHER",
} as const;
export type SupportType = (typeof SupportType)[keyof typeof SupportType];

export const caseStatusOptions = {
  Active: "Active",
  Terminated: "Terminated",
  FollowUp: "FollowUp",
  Referred: "Referred",
} as const;
export type caseStatusOptions = (typeof caseStatusOptions)[keyof typeof caseStatusOptions];

export const riskStatusOptions = {
  No: "No",
  Low: "Low",
  Medium: "Medium",
  High: "High",
} as const;
export type riskStatusOptions = (typeof riskStatusOptions)[keyof typeof riskStatusOptions];

/** Clinical session labels in order: a pre-session, four sessions, then follow-ups. */
export const clinicalSessionLabels = [
  "Pre",
  "S1",
  "S2",
  "S3",
  "S4",
  "F1",
  "F2",
  "F3",
  "F4",
] as const;
export type ClinicalSessionLabel = (typeof clinicalSessionLabels)[number];

export const referralStatusOptions = {
  Approved: "Approved",
  Declined: "Declined",
  Pending: "Pending",
} as const;
export type referralStatusOptions =
  (typeof referralStatusOptions)[keyof typeof referralStatusOptions];

export const sessionTypes = {
  INTERVENTION: "INTERVENTION",
  SUPERVISION: "SUPERVISION",
  TRAINING: "TRAINING",
  SPECIAL: "SPECIAL",
  CLINICAL: "CLINICAL",
  DATA_COLLECTION: "DATA_COLLECTION",
} as const;
export type sessionTypes = (typeof sessionTypes)[keyof typeof sessionTypes];

export const FollowUpPlanOptions = {
  GROUP: "GROUP",
  INDIVIDUAL: "INDIVIDUAL",
} as const;
export type FollowUpPlanOptions = (typeof FollowUpPlanOptions)[keyof typeof FollowUpPlanOptions];

export const RecordingProcessingStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type RecordingProcessingStatus =
  (typeof RecordingProcessingStatus)[keyof typeof RecordingProcessingStatus];

export const TranscriptionStatus = {
  QUEUED: "QUEUED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type TranscriptionStatus = (typeof TranscriptionStatus)[keyof typeof TranscriptionStatus];

export const TicketPriorityLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type TicketPriorityLevel = (typeof TicketPriorityLevel)[keyof typeof TicketPriorityLevel];

export const TicketCategory = {
  TECH: "TECH",
  RESEARCH: "RESEARCH",
  OPERATIONS: "OPERATIONS",
  CARE: "CARE",
  CLINICAL: "CLINICAL",
} as const;
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const TicketStatus = {
  OPEN: "OPEN",
  ESCALATED: "ESCALATED",
  RESOLVED: "RESOLVED",
  CANCELLED: "CANCELLED",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const SurveyStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;
export type SurveyStatus = (typeof SurveyStatus)[keyof typeof SurveyStatus];

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

/** Only a DRAFT version can be edited; publishing freezes it. */
export const SurveyVersionStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  RETIRED: "RETIRED",
} as const;
export type SurveyVersionStatus = (typeof SurveyVersionStatus)[keyof typeof SurveyVersionStatus];

export const SURVEY_VERSION_STATUS_LABELS: Record<SurveyVersionStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  RETIRED: "Retired",
};

/**
 * Which per-copy details a published version prints in its header, chosen at publish: every copy
 * carries its serial, and a version can also print the school, or the student's name and ID.
 */
export const SurveyVersionPrefill = {
  NONE: "NONE",
  SCHOOL: "SCHOOL",
  STUDENT: "STUDENT",
} as const;
export type SurveyVersionPrefill = (typeof SurveyVersionPrefill)[keyof typeof SurveyVersionPrefill];

export const SURVEY_VERSION_PREFILL_LABELS: Record<SurveyVersionPrefill, string> = {
  NONE: "Blank copies",
  SCHOOL: "School name",
  STUDENT: "Student name and ID",
};

/**
 * A print file's progress from its plan to a PDF in S3. A run has no status of its own: it is
 * read from its files (`printRunStatusOf`).
 */
export const SurveyPrintStatus = {
  QUEUED: "QUEUED",
  RENDERING: "RENDERING",
  READY: "READY",
  FAILED: "FAILED",
} as const;
export type SurveyPrintStatus = (typeof SurveyPrintStatus)[keyof typeof SurveyPrintStatus];

/** A run or file the job has yet to finish, whose page keeps refreshing until it is. */
export function isPrintUnfinished(status: SurveyPrintStatus) {
  return status === SurveyPrintStatus.QUEUED || status === SurveyPrintStatus.RENDERING;
}

export const SURVEY_PRINT_STATUS_LABELS: Record<SurveyPrintStatus, string> = {
  QUEUED: "Queued",
  RENDERING: "Rendering",
  READY: "Ready",
  FAILED: "Failed",
};

/**
 * A scanned file's progress. PENDING holds the file's hash while the browser uploads it, so a second
 * copy is refused; UPLOADED once its bytes are in S3 and checked. The pipeline (ENG-2391) moves it on.
 */
export const SurveyUploadStatus = {
  PENDING: "PENDING",
  UPLOADED: "UPLOADED",
  QUEUED: "QUEUED",
  PROCESSING: "PROCESSING",
  PROCESSED: "PROCESSED",
  FAILED: "FAILED",
} as const;
export type SurveyUploadStatus = (typeof SurveyUploadStatus)[keyof typeof SurveyUploadStatus];

export const SURVEY_UPLOAD_STATUS_LABELS: Record<SurveyUploadStatus, string> = {
  PENDING: "Uploading",
  UPLOADED: "Uploaded",
  QUEUED: "Queued",
  PROCESSING: "Processing",
  PROCESSED: "Processed",
  FAILED: "Failed",
};

/**
 * A printed copy's whole lifecycle, so later phases add no enum values: ISSUED, then PARTIAL,
 * NEEDS_REVIEW or READY as its pages come back, then VERIFIED; VOID from any state, and final.
 */
export const SurveyQuestionnaireStatus = {
  ISSUED: "ISSUED",
  PARTIAL: "PARTIAL",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  READY: "READY",
  VERIFIED: "VERIFIED",
  VOID: "VOID",
} as const;
export type SurveyQuestionnaireStatus =
  (typeof SurveyQuestionnaireStatus)[keyof typeof SurveyQuestionnaireStatus];

/** How a printed answer field is read off the page. Each grid row is a SINGLE_CHOICE. */
export const SurveyFieldKind = {
  SINGLE_CHOICE: "SINGLE_CHOICE",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  DIGITS: "DIGITS",
  DATE: "DATE",
  TEXT: "TEXT",
  SIGNATURE: "SIGNATURE",
} as const;
export type SurveyFieldKind = (typeof SurveyFieldKind)[keyof typeof SurveyFieldKind];

export const SurveyScanPageStatus = {
  MATCHED: "MATCHED",
  UNIDENTIFIED: "UNIDENTIFIED",
  DUPLICATE: "DUPLICATE",
  REJECTED: "REJECTED",
} as const;
export type SurveyScanPageStatus = (typeof SurveyScanPageStatus)[keyof typeof SurveyScanPageStatus];

export const SurveyAnswerSource = { PIPELINE: "PIPELINE", MANUAL: "MANUAL" } as const;
export type SurveyAnswerSource = (typeof SurveyAnswerSource)[keyof typeof SurveyAnswerSource];

export const SurveyAnswerReviewStatus = {
  AUTO_ACCEPTED: "AUTO_ACCEPTED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  VERIFIED: "VERIFIED",
  CORRECTED: "CORRECTED",
} as const;
export type SurveyAnswerReviewStatus =
  (typeof SurveyAnswerReviewStatus)[keyof typeof SurveyAnswerReviewStatus];

export const SURVEY_QUESTIONNAIRE_STATUS_LABELS: Record<SurveyQuestionnaireStatus, string> = {
  ISSUED: "Issued",
  PARTIAL: "Partial",
  NEEDS_REVIEW: "Needs review",
  READY: "Ready",
  VERIFIED: "Verified",
  VOID: "Void",
};

export const SurveyAuditActor = {
  USER: "USER",
  PIPELINE: "PIPELINE",
  SYSTEM: "SYSTEM",
} as const;
export type SurveyAuditActor = (typeof SurveyAuditActor)[keyof typeof SurveyAuditActor];
