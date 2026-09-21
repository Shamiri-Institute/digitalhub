// Row types named after the Prisma models they replace.
import type {
  user,
  account,
  session,
  verificationToken,
  implementer,
  implementerAvatar,
  file,
  userRecentOpen,
  userAvatar,
  implementerMember,
  implementerInvite,
  student,
  studentAttendance,
  triageEvent,
  triageEventAudit,
  studentOutcome,
  fellow,
  fellowAttendance,
  supervisor,
  supervisorAttendance,
  supervisorComplaints,
  monthlySupervisorEvaluation,
  school,
  schoolFeedback,
  schoolDropoutHistory,
  hub,
  hubCoordinator,
  interventionSession,
  interventionSessionRating,
  interventionSessionNote,
  interventionGroup,
  fellowGroupReport,
  interventionGroupReport,
  sessionComment,
  reimbursementRequest,
  repaymentRequest,
  studentReportingNotes,
  fellowReportingNotes,
  overallFellowEvaluation,
  clinicalScreeningInfo,
  clinicalCaseTransferTrail,
  clinicalExpertCaseNotes,
  clinicalSessionAttendance,
  fellowComplaints,
  weeklyFellowRatings,
  delayedPaymentRequest,
  payoutReconciliation,
  project,
  projectImplementer,
  weeklyHubReport,
  studentGroupTransferTrail,
  weeklyTeamMeetingReport,
  sessionName,
  payoutStatements,
  specialApprovalRequests,
  fellowPaymentComplaints,
  clinicalFollowUpTreatmentPlan,
  clinicalFollowUpTreatmentPlanAuditTrail,
  clinicalLead,
  clinicalTeam,
  clinicalCaseNotes,
  clinicalCaseTermination,
  opsUser,
  adminUser,
  sessionRecording,
  attendanceDocuments,
  tickets,
  ticketEscalations,
  ticketResolutions,
  ticketReassignments,
} from "./schema";

export type { JsonValue } from "./schema";

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type VerificationToken = typeof verificationToken.$inferSelect;
export type NewVerificationToken = typeof verificationToken.$inferInsert;
export type Implementer = typeof implementer.$inferSelect;
export type NewImplementer = typeof implementer.$inferInsert;
export type ImplementerAvatar = typeof implementerAvatar.$inferSelect;
export type NewImplementerAvatar = typeof implementerAvatar.$inferInsert;
export type File = typeof file.$inferSelect;
export type NewFile = typeof file.$inferInsert;
export type UserRecentOpen = typeof userRecentOpen.$inferSelect;
export type NewUserRecentOpen = typeof userRecentOpen.$inferInsert;
export type UserAvatar = typeof userAvatar.$inferSelect;
export type NewUserAvatar = typeof userAvatar.$inferInsert;
export type ImplementerMember = typeof implementerMember.$inferSelect;
export type NewImplementerMember = typeof implementerMember.$inferInsert;
export type ImplementerInvite = typeof implementerInvite.$inferSelect;
export type NewImplementerInvite = typeof implementerInvite.$inferInsert;
export type Student = typeof student.$inferSelect;
export type NewStudent = typeof student.$inferInsert;
export type StudentAttendance = typeof studentAttendance.$inferSelect;
export type NewStudentAttendance = typeof studentAttendance.$inferInsert;
export type TriageEvent = typeof triageEvent.$inferSelect;
export type NewTriageEvent = typeof triageEvent.$inferInsert;
export type TriageEventAudit = typeof triageEventAudit.$inferSelect;
export type NewTriageEventAudit = typeof triageEventAudit.$inferInsert;
export type StudentOutcome = typeof studentOutcome.$inferSelect;
export type NewStudentOutcome = typeof studentOutcome.$inferInsert;
export type Fellow = typeof fellow.$inferSelect;
export type NewFellow = typeof fellow.$inferInsert;
export type FellowAttendance = typeof fellowAttendance.$inferSelect;
export type NewFellowAttendance = typeof fellowAttendance.$inferInsert;
export type Supervisor = typeof supervisor.$inferSelect;
export type NewSupervisor = typeof supervisor.$inferInsert;
export type SupervisorAttendance = typeof supervisorAttendance.$inferSelect;
export type NewSupervisorAttendance = typeof supervisorAttendance.$inferInsert;
export type SupervisorComplaints = typeof supervisorComplaints.$inferSelect;
export type NewSupervisorComplaints = typeof supervisorComplaints.$inferInsert;
export type MonthlySupervisorEvaluation = typeof monthlySupervisorEvaluation.$inferSelect;
export type NewMonthlySupervisorEvaluation = typeof monthlySupervisorEvaluation.$inferInsert;
export type School = typeof school.$inferSelect;
export type NewSchool = typeof school.$inferInsert;
export type SchoolFeedback = typeof schoolFeedback.$inferSelect;
export type NewSchoolFeedback = typeof schoolFeedback.$inferInsert;
export type SchoolDropoutHistory = typeof schoolDropoutHistory.$inferSelect;
export type NewSchoolDropoutHistory = typeof schoolDropoutHistory.$inferInsert;
export type Hub = typeof hub.$inferSelect;
export type NewHub = typeof hub.$inferInsert;
export type HubCoordinator = typeof hubCoordinator.$inferSelect;
export type NewHubCoordinator = typeof hubCoordinator.$inferInsert;
export type InterventionSession = typeof interventionSession.$inferSelect;
export type NewInterventionSession = typeof interventionSession.$inferInsert;
export type InterventionSessionRating = typeof interventionSessionRating.$inferSelect;
export type NewInterventionSessionRating = typeof interventionSessionRating.$inferInsert;
export type InterventionSessionNote = typeof interventionSessionNote.$inferSelect;
export type NewInterventionSessionNote = typeof interventionSessionNote.$inferInsert;
export type InterventionGroup = typeof interventionGroup.$inferSelect;
export type NewInterventionGroup = typeof interventionGroup.$inferInsert;
export type FellowGroupReport = typeof fellowGroupReport.$inferSelect;
export type NewFellowGroupReport = typeof fellowGroupReport.$inferInsert;
export type InterventionGroupReport = typeof interventionGroupReport.$inferSelect;
export type NewInterventionGroupReport = typeof interventionGroupReport.$inferInsert;
export type SessionComment = typeof sessionComment.$inferSelect;
export type NewSessionComment = typeof sessionComment.$inferInsert;
export type ReimbursementRequest = typeof reimbursementRequest.$inferSelect;
export type NewReimbursementRequest = typeof reimbursementRequest.$inferInsert;
export type RepaymentRequest = typeof repaymentRequest.$inferSelect;
export type NewRepaymentRequest = typeof repaymentRequest.$inferInsert;
export type StudentReportingNotes = typeof studentReportingNotes.$inferSelect;
export type NewStudentReportingNotes = typeof studentReportingNotes.$inferInsert;
export type FellowReportingNotes = typeof fellowReportingNotes.$inferSelect;
export type NewFellowReportingNotes = typeof fellowReportingNotes.$inferInsert;
export type OverallFellowEvaluation = typeof overallFellowEvaluation.$inferSelect;
export type NewOverallFellowEvaluation = typeof overallFellowEvaluation.$inferInsert;
export type ClinicalScreeningInfo = typeof clinicalScreeningInfo.$inferSelect;
export type NewClinicalScreeningInfo = typeof clinicalScreeningInfo.$inferInsert;
export type ClinicalCaseTransferTrail = typeof clinicalCaseTransferTrail.$inferSelect;
export type NewClinicalCaseTransferTrail = typeof clinicalCaseTransferTrail.$inferInsert;
export type ClinicalExpertCaseNotes = typeof clinicalExpertCaseNotes.$inferSelect;
export type NewClinicalExpertCaseNotes = typeof clinicalExpertCaseNotes.$inferInsert;
export type ClinicalSessionAttendance = typeof clinicalSessionAttendance.$inferSelect;
export type NewClinicalSessionAttendance = typeof clinicalSessionAttendance.$inferInsert;
export type FellowComplaints = typeof fellowComplaints.$inferSelect;
export type NewFellowComplaints = typeof fellowComplaints.$inferInsert;
export type WeeklyFellowRatings = typeof weeklyFellowRatings.$inferSelect;
export type NewWeeklyFellowRatings = typeof weeklyFellowRatings.$inferInsert;
export type DelayedPaymentRequest = typeof delayedPaymentRequest.$inferSelect;
export type NewDelayedPaymentRequest = typeof delayedPaymentRequest.$inferInsert;
export type PayoutReconciliation = typeof payoutReconciliation.$inferSelect;
export type NewPayoutReconciliation = typeof payoutReconciliation.$inferInsert;
export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type ProjectImplementer = typeof projectImplementer.$inferSelect;
export type NewProjectImplementer = typeof projectImplementer.$inferInsert;
export type WeeklyHubReport = typeof weeklyHubReport.$inferSelect;
export type NewWeeklyHubReport = typeof weeklyHubReport.$inferInsert;
export type StudentGroupTransferTrail = typeof studentGroupTransferTrail.$inferSelect;
export type NewStudentGroupTransferTrail = typeof studentGroupTransferTrail.$inferInsert;
export type WeeklyTeamMeetingReport = typeof weeklyTeamMeetingReport.$inferSelect;
export type NewWeeklyTeamMeetingReport = typeof weeklyTeamMeetingReport.$inferInsert;
export type SessionName = typeof sessionName.$inferSelect;
export type NewSessionName = typeof sessionName.$inferInsert;
export type PayoutStatements = typeof payoutStatements.$inferSelect;
export type NewPayoutStatements = typeof payoutStatements.$inferInsert;
export type SpecialApprovalRequests = typeof specialApprovalRequests.$inferSelect;
export type NewSpecialApprovalRequests = typeof specialApprovalRequests.$inferInsert;
export type FellowPaymentComplaints = typeof fellowPaymentComplaints.$inferSelect;
export type NewFellowPaymentComplaints = typeof fellowPaymentComplaints.$inferInsert;
export type ClinicalFollowUpTreatmentPlan = typeof clinicalFollowUpTreatmentPlan.$inferSelect;
export type NewClinicalFollowUpTreatmentPlan = typeof clinicalFollowUpTreatmentPlan.$inferInsert;
export type ClinicalFollowUpTreatmentPlanAuditTrail =
  typeof clinicalFollowUpTreatmentPlanAuditTrail.$inferSelect;
export type NewClinicalFollowUpTreatmentPlanAuditTrail =
  typeof clinicalFollowUpTreatmentPlanAuditTrail.$inferInsert;
export type ClinicalLead = typeof clinicalLead.$inferSelect;
export type NewClinicalLead = typeof clinicalLead.$inferInsert;
export type ClinicalTeam = typeof clinicalTeam.$inferSelect;
export type NewClinicalTeam = typeof clinicalTeam.$inferInsert;
export type ClinicalCaseNotes = typeof clinicalCaseNotes.$inferSelect;
export type NewClinicalCaseNotes = typeof clinicalCaseNotes.$inferInsert;
export type ClinicalCaseTermination = typeof clinicalCaseTermination.$inferSelect;
export type NewClinicalCaseTermination = typeof clinicalCaseTermination.$inferInsert;
export type OpsUser = typeof opsUser.$inferSelect;
export type NewOpsUser = typeof opsUser.$inferInsert;
export type AdminUser = typeof adminUser.$inferSelect;
export type NewAdminUser = typeof adminUser.$inferInsert;
export type SessionRecording = typeof sessionRecording.$inferSelect;
export type NewSessionRecording = typeof sessionRecording.$inferInsert;
export type AttendanceDocuments = typeof attendanceDocuments.$inferSelect;
export type NewAttendanceDocuments = typeof attendanceDocuments.$inferInsert;
export type Tickets = typeof tickets.$inferSelect;
export type NewTickets = typeof tickets.$inferInsert;
export type TicketEscalations = typeof ticketEscalations.$inferSelect;
export type NewTicketEscalations = typeof ticketEscalations.$inferInsert;
export type TicketResolutions = typeof ticketResolutions.$inferSelect;
export type NewTicketResolutions = typeof ticketResolutions.$inferInsert;
export type TicketReassignments = typeof ticketReassignments.$inferSelect;
export type NewTicketReassignments = typeof ticketReassignments.$inferInsert;
