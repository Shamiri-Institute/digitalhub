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
