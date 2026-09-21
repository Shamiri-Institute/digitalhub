// Generated from prisma/schema.prisma relation fields, so every relation keeps its Prisma name.
import { relations } from "drizzle-orm";

import {
  account,
  attendanceDocuments,
  clinicalCaseNotes,
  clinicalCaseTermination,
  clinicalCaseTransferTrail,
  clinicalExpertCaseNotes,
  clinicalFollowUpTreatmentPlan,
  clinicalFollowUpTreatmentPlanAuditTrail,
  clinicalLead,
  clinicalScreeningInfo,
  clinicalSessionAttendance,
  clinicalTeam,
  delayedPaymentRequest,
  fellow,
  fellowAttendance,
  fellowComplaints,
  fellowGroupReport,
  fellowPaymentComplaints,
  fellowReportingNotes,
  file,
  hub,
  hubCoordinator,
  implementer,
  implementerAvatar,
  implementerInvite,
  implementerMember,
  interventionGroup,
  interventionGroupReport,
  interventionSession,
  interventionSessionNote,
  interventionSessionRating,
  monthlySupervisorEvaluation,
  opsUser,
  overallFellowEvaluation,
  payoutReconciliation,
  payoutStatements,
  project,
  projectImplementer,
  reimbursementRequest,
  repaymentRequest,
  school,
  schoolDropoutHistory,
  schoolFeedback,
  session,
  sessionComment,
  sessionName,
  sessionRecording,
  specialApprovalRequests,
  student,
  studentAttendance,
  studentGroupTransferTrail,
  studentOutcome,
  studentReportingNotes,
  supervisor,
  supervisorAttendance,
  supervisorComplaints,
  ticketEscalations,
  ticketReassignments,
  ticketResolutions,
  tickets,
  triageEvent,
  triageEventAudit,
  user,
  userAvatar,
  userRecentOpen,
  weeklyFellowRatings,
  weeklyHubReport,
  weeklyTeamMeetingReport,
} from "./schema";

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
    relationName: "Account_user",
  }),
}));

export const attendanceDocumentsRelations = relations(attendanceDocuments, ({ one }) => ({
  group: one(interventionGroup, {
    fields: [attendanceDocuments.groupId],
    references: [interventionGroup.id],
    relationName: "AttendanceDocuments_group",
  }),
  session: one(interventionSession, {
    fields: [attendanceDocuments.sessionId],
    references: [interventionSession.id],
    relationName: "AttendanceDocuments_session",
  }),
  user: one(user, {
    fields: [attendanceDocuments.uploadedBy],
    references: [user.id],
    relationName: "AttendanceDocuments_user",
  }),
}));

export const clinicalCaseNotesRelations = relations(clinicalCaseNotes, ({ one }) => ({
  case: one(clinicalScreeningInfo, {
    fields: [clinicalCaseNotes.caseId],
    references: [clinicalScreeningInfo.id],
    relationName: "ClinicalCaseNotes_case",
  }),
  session: one(clinicalSessionAttendance, {
    fields: [clinicalCaseNotes.sessionId],
    references: [clinicalSessionAttendance.id],
    relationName: "ClinicalCaseNotes_session",
  }),
  user: one(user, {
    fields: [clinicalCaseNotes.createdBy],
    references: [user.id],
    relationName: "ClinicalCaseNotes_user",
  }),
}));

export const clinicalCaseTerminationRelations = relations(clinicalCaseTermination, ({ one }) => ({
  case: one(clinicalScreeningInfo, {
    fields: [clinicalCaseTermination.caseId],
    references: [clinicalScreeningInfo.id],
    relationName: "ClinicalCaseTermination_case",
  }),
  session: one(clinicalSessionAttendance, {
    fields: [clinicalCaseTermination.sessionId],
    references: [clinicalSessionAttendance.id],
    relationName: "ClinicalCaseTermination_session",
  }),
  user: one(user, {
    fields: [clinicalCaseTermination.createdBy],
    references: [user.id],
    relationName: "ClinicalCaseTermination_user",
  }),
}));

export const clinicalCaseTransferTrailRelations = relations(
  clinicalCaseTransferTrail,
  ({ one }) => ({
    case: one(clinicalScreeningInfo, {
      fields: [clinicalCaseTransferTrail.caseId],
      references: [clinicalScreeningInfo.id],
      relationName: "ClinicalCaseTransferTrail_case",
    }),
  }),
);

export const clinicalExpertCaseNotesRelations = relations(clinicalExpertCaseNotes, ({ one }) => ({
  case: one(clinicalScreeningInfo, {
    fields: [clinicalExpertCaseNotes.caseId],
    references: [clinicalScreeningInfo.id],
    relationName: "ClinicalExpertCaseNotes_case",
  }),
}));

export const clinicalFollowUpTreatmentPlanRelations = relations(
  clinicalFollowUpTreatmentPlan,
  ({ one }) => ({
    case: one(clinicalScreeningInfo, {
      fields: [clinicalFollowUpTreatmentPlan.caseId],
      references: [clinicalScreeningInfo.id],
    }),
  }),
);

export const clinicalFollowUpTreatmentPlanAuditTrailRelations = relations(
  clinicalFollowUpTreatmentPlanAuditTrail,
  ({ one }) => ({
    user: one(user, {
      fields: [clinicalFollowUpTreatmentPlanAuditTrail.userId],
      references: [user.id],
      relationName: "ClinicalFollowUpTreatmentPlanAuditTrail_user",
    }),
    case: one(clinicalScreeningInfo, {
      fields: [clinicalFollowUpTreatmentPlanAuditTrail.caseId],
      references: [clinicalScreeningInfo.id],
      relationName: "ClinicalFollowUpTreatmentPlanAuditTrail_case",
    }),
  }),
);

export const clinicalLeadRelations = relations(clinicalLead, ({ one, many }) => ({
  clinicalScreeningCases: many(clinicalScreeningInfo, {
    relationName: "ClinicalScreeningInfo_clinicalLead",
  }),
  assignedHub: one(hub, {
    fields: [clinicalLead.assignedHubId],
    references: [hub.id],
    relationName: "ClinicalLead_assignedHub",
  }),
  implementer: one(implementer, {
    fields: [clinicalLead.implementerId],
    references: [implementer.id],
    relationName: "ClinicalLead_implementer",
  }),
}));

export const clinicalScreeningInfoRelations = relations(clinicalScreeningInfo, ({ one, many }) => ({
  student: one(student, {
    fields: [clinicalScreeningInfo.studentId],
    references: [student.id],
    relationName: "ClinicalScreeningInfo_student",
  }),
  currentSupervisor: one(supervisor, {
    fields: [clinicalScreeningInfo.currentSupervisorId],
    references: [supervisor.id],
    relationName: "ClinicalScreeningInfo_currentSupervisor",
  }),
  referredToSupervisor: one(supervisor, {
    fields: [clinicalScreeningInfo.referredToSupervisorId],
    references: [supervisor.id],
    relationName: "referredtocases",
  }),
  sessionWhenCaseIsFlagged: one(interventionSession, {
    fields: [clinicalScreeningInfo.sessionWhenCaseIsFlaggedId],
    references: [interventionSession.id],
    relationName: "ClinicalScreeningInfo_sessionWhenCaseIsFlagged",
  }),
  clinicalLead: one(clinicalLead, {
    fields: [clinicalScreeningInfo.clinicalLeadId],
    references: [clinicalLead.id],
    relationName: "ClinicalScreeningInfo_clinicalLead",
  }),
  caseTransferTrail: many(clinicalCaseTransferTrail, {
    relationName: "ClinicalCaseTransferTrail_case",
  }),
  consultingClinicalExpert: many(clinicalExpertCaseNotes, {
    relationName: "ClinicalExpertCaseNotes_case",
  }),
  sessions: many(clinicalSessionAttendance, { relationName: "ClinicalSessionAttendance_case" }),
  followUptreatmentPlan: one(clinicalFollowUpTreatmentPlan),
  clinicalFollowUpTreatmentPlanAuditTrail: many(clinicalFollowUpTreatmentPlanAuditTrail, {
    relationName: "ClinicalFollowUpTreatmentPlanAuditTrail_case",
  }),
  clinicalCaseNotes: many(clinicalCaseNotes, { relationName: "ClinicalCaseNotes_case" }),
  clinicalCaseTermination: many(clinicalCaseTermination, {
    relationName: "ClinicalCaseTermination_case",
  }),
}));

export const clinicalSessionAttendanceRelations = relations(
  clinicalSessionAttendance,
  ({ one, many }) => ({
    case: one(clinicalScreeningInfo, {
      fields: [clinicalSessionAttendance.caseId],
      references: [clinicalScreeningInfo.id],
      relationName: "ClinicalSessionAttendance_case",
    }),
    clinicalCaseNotes: many(clinicalCaseNotes, { relationName: "ClinicalCaseNotes_session" }),
    clinicalCaseTermination: many(clinicalCaseTermination, {
      relationName: "ClinicalCaseTermination_session",
    }),
  }),
);

export const clinicalTeamRelations = relations(clinicalTeam, ({ one }) => ({
  assignedHub: one(hub, {
    fields: [clinicalTeam.assignedHubId],
    references: [hub.id],
    relationName: "ClinicalTeam_assignedHub",
  }),
  implementer: one(implementer, {
    fields: [clinicalTeam.implementerId],
    references: [implementer.id],
    relationName: "ClinicalTeam_implementer",
  }),
}));

export const delayedPaymentRequestRelations = relations(delayedPaymentRequest, ({ one }) => ({
  fellow: one(fellow, {
    fields: [delayedPaymentRequest.fellowId],
    references: [fellow.id],
    relationName: "DelayedPaymentRequest_fellow",
  }),
  supervisor: one(supervisor, {
    fields: [delayedPaymentRequest.supervisorId],
    references: [supervisor.id],
    relationName: "DelayedPaymentRequest_supervisor",
  }),
  interventionSession: one(interventionSession, {
    fields: [delayedPaymentRequest.interventionSessionId],
    references: [interventionSession.id],
    relationName: "DelayedPaymentRequest_interventionSession",
  }),
  fellowAttendance: one(fellowAttendance, {
    fields: [delayedPaymentRequest.fellowAttendanceId],
    references: [fellowAttendance.id],
    relationName: "DelayedPaymentRequest_fellowAttendance",
  }),
}));

export const fellowRelations = relations(fellow, ({ one, many }) => ({
  students: many(student, { relationName: "Student_fellow" }),
  studentAttendances: many(studentAttendance, { relationName: "StudentAttendance_fellow" }),
  triageEvents: many(triageEvent, { relationName: "TriageEvent_fellow" }),
  hub: one(hub, { fields: [fellow.hubId], references: [hub.id], relationName: "Fellow_hub" }),
  implementer: one(implementer, {
    fields: [fellow.implementerId],
    references: [implementer.id],
    relationName: "Fellow_implementer",
  }),
  supervisor: one(supervisor, {
    fields: [fellow.supervisorId],
    references: [supervisor.id],
    relationName: "Fellow_supervisor",
  }),
  fellowAttendances: many(fellowAttendance, { relationName: "FellowAttendance_fellow" }),
  groups: many(interventionGroup, { relationName: "InterventionGroup_leader" }),
  fellowGroupReports: many(fellowGroupReport, { relationName: "FellowGroupReport_fellow" }),
  repaymentRequests: many(repaymentRequest, { relationName: "RepaymentRequest_fellow" }),
  fellowReportingNotes: many(fellowReportingNotes, { relationName: "FellowReportingNotes_fellow" }),
  overallFellowEvaluation: many(overallFellowEvaluation, {
    relationName: "OverallFellowEvaluation_fellow",
  }),
  fellowComplaints: many(fellowComplaints, { relationName: "FellowComplaints_fellow" }),
  weeklyFellowRatings: many(weeklyFellowRatings, { relationName: "WeeklyFellowRatings_fellow" }),
  delayedPaymentRequests: many(delayedPaymentRequest, {
    relationName: "DelayedPaymentRequest_fellow",
  }),
  payoutReconciliations: many(payoutReconciliation, {
    relationName: "PayoutReconciliation_fellow",
  }),
  PayoutStatements: many(payoutStatements, { relationName: "PayoutStatements_fellow" }),
  sessionRecordings: many(sessionRecording, { relationName: "SessionRecording_fellow" }),
}));

export const fellowAttendanceRelations = relations(fellowAttendance, ({ one, many }) => ({
  project: one(project, {
    fields: [fellowAttendance.projectId],
    references: [project.id],
    relationName: "FellowAttendance_project",
  }),
  fellow: one(fellow, {
    fields: [fellowAttendance.fellowId],
    references: [fellow.id],
    relationName: "FellowAttendance_fellow",
  }),
  school: one(school, {
    fields: [fellowAttendance.schoolId],
    references: [school.id],
    relationName: "FellowAttendance_school",
  }),
  supervisor: one(supervisor, {
    fields: [fellowAttendance.supervisorId],
    references: [supervisor.id],
    relationName: "FellowAttendance_supervisor",
  }),
  session: one(interventionSession, {
    fields: [fellowAttendance.sessionId],
    references: [interventionSession.id],
    relationName: "FellowAttendance_session",
  }),
  group: one(interventionGroup, {
    fields: [fellowAttendance.groupId],
    references: [interventionGroup.id],
    relationName: "FellowAttendance_group",
  }),
  user: one(user, {
    fields: [fellowAttendance.markedBy],
    references: [user.id],
    relationName: "FellowAttendance_user",
  }),
  repaymentRequests: many(repaymentRequest, { relationName: "RepaymentRequest_fellowAttendance" }),
  delayedPaymentRequests: many(delayedPaymentRequest, {
    relationName: "DelayedPaymentRequest_fellowAttendance",
  }),
  PayoutStatements: many(payoutStatements, { relationName: "PayoutStatements_fellowAttendance" }),
  SpecialApprovalRequests: many(specialApprovalRequests, {
    relationName: "SpecialApprovalRequests_fellowAttendance",
  }),
  fellowPaymentComplaints: many(fellowPaymentComplaints, {
    relationName: "FellowPaymentComplaints_fellowAttendance",
  }),
}));

export const fellowComplaintsRelations = relations(fellowComplaints, ({ one }) => ({
  supervisor: one(supervisor, {
    fields: [fellowComplaints.supervisorId],
    references: [supervisor.id],
    relationName: "FellowComplaints_supervisor",
  }),
  fellow: one(fellow, {
    fields: [fellowComplaints.fellowId],
    references: [fellow.id],
    relationName: "FellowComplaints_fellow",
  }),
  user: one(user, {
    fields: [fellowComplaints.createdBy],
    references: [user.id],
    relationName: "FellowComplaints_user",
  }),
}));

export const fellowGroupReportRelations = relations(fellowGroupReport, ({ one }) => ({
  fellow: one(fellow, {
    fields: [fellowGroupReport.fellowId],
    references: [fellow.id],
    relationName: "FellowGroupReport_fellow",
  }),
  group: one(interventionGroup, {
    fields: [fellowGroupReport.groupId],
    references: [interventionGroup.id],
    relationName: "FellowGroupReport_group",
  }),
  project: one(project, {
    fields: [fellowGroupReport.projectId],
    references: [project.id],
    relationName: "FellowGroupReport_project",
  }),
}));

export const fellowPaymentComplaintsRelations = relations(fellowPaymentComplaints, ({ one }) => ({
  fellowAttendance: one(fellowAttendance, {
    fields: [fellowPaymentComplaints.fellowAttendanceId],
    references: [fellowAttendance.id],
    relationName: "FellowPaymentComplaints_fellowAttendance",
  }),
}));

export const fellowReportingNotesRelations = relations(fellowReportingNotes, ({ one }) => ({
  supervisor: one(supervisor, {
    fields: [fellowReportingNotes.supervisorId],
    references: [supervisor.id],
    relationName: "FellowReportingNotes_supervisor",
  }),
  fellow: one(fellow, {
    fields: [fellowReportingNotes.fellowId],
    references: [fellow.id],
    relationName: "FellowReportingNotes_fellow",
  }),
}));

export const fileRelations = relations(file, ({ one }) => ({
  implementerAvatar: one(implementerAvatar),
  userAvatar: one(userAvatar),
}));

export const hubRelations = relations(hub, ({ one, many }) => ({
  triageEvents: many(triageEvent, { relationName: "TriageEvent_hub" }),
  fellows: many(fellow, { relationName: "Fellow_hub" }),
  supervisors: many(supervisor, { relationName: "Supervisor_hub" }),
  schools: many(school, { relationName: "School_hub" }),
  implementer: one(implementer, {
    fields: [hub.implementerId],
    references: [implementer.id],
    relationName: "Hub_implementer",
  }),
  project: one(project, {
    fields: [hub.projectId],
    references: [project.id],
    relationName: "Hub_project",
  }),
  coordinators: many(hubCoordinator, { relationName: "HubCoordinator_assignedHub" }),
  hubSessions: many(interventionSession, { relationName: "InterventionSession_hub" }),
  reimbursementRequests: many(reimbursementRequest, { relationName: "ReimbursementRequest_hub" }),
  repaymentRequests: many(repaymentRequest, { relationName: "RepaymentRequest_hub" }),
  weeklyHubReports: many(weeklyHubReport, { relationName: "WeeklyHubReport_hub" }),
  WeeklyTeamMeetingReport: many(weeklyTeamMeetingReport, {
    relationName: "WeeklyTeamMeetingReport_hub",
  }),
  sessions: many(sessionName, { relationName: "SessionName_hub" }),
  clinicalLeads: many(clinicalLead, { relationName: "ClinicalLead_assignedHub" }),
  clinicalTeam: many(clinicalTeam, { relationName: "ClinicalTeam_assignedHub" }),
  opsUser: many(opsUser, { relationName: "OpsUser_assignedHub" }),
}));

export const hubCoordinatorRelations = relations(hubCoordinator, ({ one, many }) => ({
  supervisorComplaints: many(supervisorComplaints, {
    relationName: "SupervisorComplaints_hubCoordinator",
  }),
  MonthlySupervisorEvaluation: many(monthlySupervisorEvaluation, {
    relationName: "MonthlySupervisorEvaluation_hubCoordinator",
  }),
  implementer: one(implementer, {
    fields: [hubCoordinator.implementerId],
    references: [implementer.id],
    relationName: "HubCoordinator_implementer",
  }),
  assignedHub: one(hub, {
    fields: [hubCoordinator.assignedHubId],
    references: [hub.id],
    relationName: "HubCoordinator_assignedHub",
  }),
  reimbursementRequests: many(reimbursementRequest, {
    relationName: "ReimbursementRequest_hubCoordinator",
  }),
  weeklyHubReports: many(weeklyHubReport, { relationName: "WeeklyHubReport_hubCoordinator" }),
  WeeklyTeamMeetingReport: many(weeklyTeamMeetingReport, {
    relationName: "WeeklyTeamMeetingReport_hubCoordinator",
  }),
  SpecialApprovalRequests: many(specialApprovalRequests, {
    relationName: "SpecialApprovalRequests_hubCoordinator",
  }),
}));

export const implementerRelations = relations(implementer, ({ one, many }) => ({
  avatar: one(implementerAvatar),
  memberships: many(implementerMember, { relationName: "ImplementerMember_implementer" }),
  invites: many(implementerInvite, { relationName: "ImplementerInvite_implementer" }),
  students: many(student, { relationName: "Student_implementer" }),
  studentOutcomes: many(studentOutcome, { relationName: "StudentOutcome_implementer" }),
  fellows: many(fellow, { relationName: "Fellow_implementer" }),
  supervisors: many(supervisor, { relationName: "Supervisor_implementer" }),
  schools: many(school, { relationName: "School_implementer" }),
  hubs: many(hub, { relationName: "Hub_implementer" }),
  hubCoordinators: many(hubCoordinator, { relationName: "HubCoordinator_implementer" }),
  projectImplementers: many(projectImplementer, { relationName: "ProjectImplementer_implementer" }),
  clinicalLeads: many(clinicalLead, { relationName: "ClinicalLead_implementer" }),
  clinicalTeam: many(clinicalTeam, { relationName: "ClinicalTeam_implementer" }),
  opsUser: many(opsUser, { relationName: "OpsUser_implementer" }),
}));

export const implementerAvatarRelations = relations(implementerAvatar, ({ one }) => ({
  implementer: one(implementer, {
    fields: [implementerAvatar.implementerId],
    references: [implementer.id],
  }),
  file: one(file, { fields: [implementerAvatar.fileId], references: [file.id] }),
}));

export const implementerInviteRelations = relations(implementerInvite, ({ one }) => ({
  implementer: one(implementer, {
    fields: [implementerInvite.implementerId],
    references: [implementer.id],
    relationName: "ImplementerInvite_implementer",
  }),
}));

export const implementerMemberRelations = relations(implementerMember, ({ one }) => ({
  implementer: one(implementer, {
    fields: [implementerMember.implementerId],
    references: [implementer.id],
    relationName: "ImplementerMember_implementer",
  }),
  user: one(user, {
    fields: [implementerMember.userId],
    references: [user.id],
    relationName: "ImplementerMember_user",
  }),
}));

export const interventionGroupRelations = relations(interventionGroup, ({ one, many }) => ({
  students: many(student, { relationName: "Student_assignedGroup" }),
  studentAttendances: many(studentAttendance, { relationName: "StudentAttendance_group" }),
  fellowAttendances: many(fellowAttendance, { relationName: "FellowAttendance_group" }),
  leader: one(fellow, {
    fields: [interventionGroup.leaderId],
    references: [fellow.id],
    relationName: "InterventionGroup_leader",
  }),
  school: one(school, {
    fields: [interventionGroup.schoolId],
    references: [school.id],
    relationName: "InterventionGroup_school",
  }),
  project: one(project, {
    fields: [interventionGroup.projectId],
    references: [project.id],
    relationName: "InterventionGroup_project",
  }),
  fellowGroupReports: many(fellowGroupReport, { relationName: "FellowGroupReport_group" }),
  interventionGroupReports: many(interventionGroupReport, {
    relationName: "InterventionGroupReport_group",
  }),
  studentGroupTransferTrail: many(studentGroupTransferTrail, {
    relationName: "StudentGroupTransferTrail_fromGroup",
  }),
  sessionRecordings: many(sessionRecording, { relationName: "SessionRecording_group" }),
  attendanceDocuments: many(attendanceDocuments, { relationName: "AttendanceDocuments_group" }),
}));

export const interventionGroupReportRelations = relations(interventionGroupReport, ({ one }) => ({
  group: one(interventionGroup, {
    fields: [interventionGroupReport.groupId],
    references: [interventionGroup.id],
    relationName: "InterventionGroupReport_group",
  }),
  session: one(interventionSession, {
    fields: [interventionGroupReport.sessionId],
    references: [interventionSession.id],
    relationName: "InterventionGroupReport_session",
  }),
}));

export const interventionSessionRelations = relations(interventionSession, ({ one, many }) => ({
  studentAttendances: many(studentAttendance, { relationName: "StudentAttendance_session" }),
  triageEvents: many(triageEvent, { relationName: "TriageEvent_session" }),
  fellowAttendances: many(fellowAttendance, { relationName: "FellowAttendance_session" }),
  supervisorAttendances: many(supervisorAttendance, {
    relationName: "SupervisorAttendance_session",
  }),
  session: one(sessionName, {
    fields: [interventionSession.sessionId],
    references: [sessionName.id],
    relationName: "InterventionSession_session",
  }),
  school: one(school, {
    fields: [interventionSession.schoolId],
    references: [school.id],
    relationName: "InterventionSession_school",
  }),
  project: one(project, {
    fields: [interventionSession.projectId],
    references: [project.id],
    relationName: "InterventionSession_project",
  }),
  hub: one(hub, {
    fields: [interventionSession.hubId],
    references: [hub.id],
    relationName: "InterventionSession_hub",
  }),
  sessionRatings: many(interventionSessionRating, {
    relationName: "InterventionSessionRating_session",
  }),
  sessionNotes: many(interventionSessionNote, { relationName: "InterventionSessionNote_session" }),
  InterventionGroupReport: many(interventionGroupReport, {
    relationName: "InterventionGroupReport_session",
  }),
  sessionComments: many(sessionComment, { relationName: "SessionComment_session" }),
  clinicalCases: many(clinicalScreeningInfo, {
    relationName: "ClinicalScreeningInfo_sessionWhenCaseIsFlagged",
  }),
  delayedPaymentRequests: many(delayedPaymentRequest, {
    relationName: "DelayedPaymentRequest_interventionSession",
  }),
  sessionRecordings: many(sessionRecording, { relationName: "SessionRecording_session" }),
  attendanceDocuments: many(attendanceDocuments, { relationName: "AttendanceDocuments_session" }),
}));

export const interventionSessionNoteRelations = relations(interventionSessionNote, ({ one }) => ({
  session: one(interventionSession, {
    fields: [interventionSessionNote.sessionId],
    references: [interventionSession.id],
    relationName: "InterventionSessionNote_session",
  }),
  supervisor: one(supervisor, {
    fields: [interventionSessionNote.supervisorId],
    references: [supervisor.id],
    relationName: "InterventionSessionNote_supervisor",
  }),
}));

export const interventionSessionRatingRelations = relations(
  interventionSessionRating,
  ({ one }) => ({
    session: one(interventionSession, {
      fields: [interventionSessionRating.sessionId],
      references: [interventionSession.id],
      relationName: "InterventionSessionRating_session",
    }),
    supervisor: one(supervisor, {
      fields: [interventionSessionRating.supervisorId],
      references: [supervisor.id],
      relationName: "InterventionSessionRating_supervisor",
    }),
  }),
);

export const monthlySupervisorEvaluationRelations = relations(
  monthlySupervisorEvaluation,
  ({ one }) => ({
    project: one(project, {
      fields: [monthlySupervisorEvaluation.projectId],
      references: [project.id],
      relationName: "MonthlySupervisorEvaluation_project",
    }),
    supervisor: one(supervisor, {
      fields: [monthlySupervisorEvaluation.supervisorId],
      references: [supervisor.id],
      relationName: "MonthlySupervisorEvaluation_supervisor",
    }),
    hubCoordinator: one(hubCoordinator, {
      fields: [monthlySupervisorEvaluation.hubCoordinatorId],
      references: [hubCoordinator.id],
      relationName: "MonthlySupervisorEvaluation_hubCoordinator",
    }),
  }),
);

export const opsUserRelations = relations(opsUser, ({ one }) => ({
  implementer: one(implementer, {
    fields: [opsUser.implementerId],
    references: [implementer.id],
    relationName: "OpsUser_implementer",
  }),
  assignedHub: one(hub, {
    fields: [opsUser.assignedHubId],
    references: [hub.id],
    relationName: "OpsUser_assignedHub",
  }),
}));

export const overallFellowEvaluationRelations = relations(overallFellowEvaluation, ({ one }) => ({
  supervisor: one(supervisor, {
    fields: [overallFellowEvaluation.supervisorId],
    references: [supervisor.id],
    relationName: "OverallFellowEvaluation_supervisor",
  }),
  fellow: one(fellow, {
    fields: [overallFellowEvaluation.fellowId],
    references: [fellow.id],
    relationName: "OverallFellowEvaluation_fellow",
  }),
}));

export const payoutReconciliationRelations = relations(payoutReconciliation, ({ one }) => ({
  fellow: one(fellow, {
    fields: [payoutReconciliation.fellowId],
    references: [fellow.id],
    relationName: "PayoutReconciliation_fellow",
  }),
}));

export const payoutStatementsRelations = relations(payoutStatements, ({ one }) => ({
  fellowAttendance: one(fellowAttendance, {
    fields: [payoutStatements.fellowAttendanceId],
    references: [fellowAttendance.id],
    relationName: "PayoutStatements_fellowAttendance",
  }),
  fellow: one(fellow, {
    fields: [payoutStatements.fellowId],
    references: [fellow.id],
    relationName: "PayoutStatements_fellow",
  }),
  user: one(user, {
    fields: [payoutStatements.createdBy],
    references: [user.id],
    relationName: "PayoutStatements_user",
  }),
  specialPayoutRequest: one(specialApprovalRequests, {
    fields: [payoutStatements.specialPayoutRequestId],
    references: [specialApprovalRequests.id],
    relationName: "PayoutStatements_specialPayoutRequest",
  }),
  confirmedByUser: one(user, {
    fields: [payoutStatements.confirmedBy],
    references: [user.id],
    relationName: "payout_statements_confirmed_by",
  }),
}));

export const projectRelations = relations(project, ({ many }) => ({
  usersWithActiveProject: many(user, { relationName: "UserActiveProject" }),
  studentAttendances: many(studentAttendance, { relationName: "StudentAttendance_project" }),
  fellowAttendances: many(fellowAttendance, { relationName: "FellowAttendance_project" }),
  supervisorAttendances: many(supervisorAttendance, {
    relationName: "SupervisorAttendance_project",
  }),
  supervisorComplaints: many(supervisorComplaints, {
    relationName: "SupervisorComplaints_project",
  }),
  MonthlySupervisorEvaluation: many(monthlySupervisorEvaluation, {
    relationName: "MonthlySupervisorEvaluation_project",
  }),
  hubs: many(hub, { relationName: "Hub_project" }),
  interventionSessions: many(interventionSession, { relationName: "InterventionSession_project" }),
  interventionGroups: many(interventionGroup, { relationName: "InterventionGroup_project" }),
  fellowGroupReports: many(fellowGroupReport, { relationName: "FellowGroupReport_project" }),
  projectImplementers: many(projectImplementer, { relationName: "ProjectImplementer_project" }),
}));

export const projectImplementerRelations = relations(projectImplementer, ({ one }) => ({
  project: one(project, {
    fields: [projectImplementer.projectId],
    references: [project.id],
    relationName: "ProjectImplementer_project",
  }),
  implementer: one(implementer, {
    fields: [projectImplementer.implementerId],
    references: [implementer.id],
    relationName: "ProjectImplementer_implementer",
  }),
}));

export const reimbursementRequestRelations = relations(reimbursementRequest, ({ one }) => ({
  supervisor: one(supervisor, {
    fields: [reimbursementRequest.supervisorId],
    references: [supervisor.id],
    relationName: "ReimbursementRequest_supervisor",
  }),
  hub: one(hub, {
    fields: [reimbursementRequest.hubId],
    references: [hub.id],
    relationName: "ReimbursementRequest_hub",
  }),
  hubCoordinator: one(hubCoordinator, {
    fields: [reimbursementRequest.hubCoordinatorId],
    references: [hubCoordinator.id],
    relationName: "ReimbursementRequest_hubCoordinator",
  }),
}));

export const repaymentRequestRelations = relations(repaymentRequest, ({ one }) => ({
  supervisor: one(supervisor, {
    fields: [repaymentRequest.supervisorId],
    references: [supervisor.id],
    relationName: "RepaymentRequest_supervisor",
  }),
  fellow: one(fellow, {
    fields: [repaymentRequest.fellowId],
    references: [fellow.id],
    relationName: "RepaymentRequest_fellow",
  }),
  hub: one(hub, {
    fields: [repaymentRequest.hubId],
    references: [hub.id],
    relationName: "RepaymentRequest_hub",
  }),
  fellowAttendance: one(fellowAttendance, {
    fields: [repaymentRequest.fellowAttendanceId],
    references: [fellowAttendance.id],
    relationName: "RepaymentRequest_fellowAttendance",
  }),
}));

export const schoolRelations = relations(school, ({ one, many }) => ({
  students: many(student, { relationName: "Student_school" }),
  studentAttendances: many(studentAttendance, { relationName: "StudentAttendance_school" }),
  fellowAttendances: many(fellowAttendance, { relationName: "FellowAttendance_school" }),
  supervisorAttendances: many(supervisorAttendance, {
    relationName: "SupervisorAttendance_school",
  }),
  implementer: one(implementer, {
    fields: [school.implementerId],
    references: [implementer.id],
    relationName: "School_implementer",
  }),
  hub: one(hub, { fields: [school.hubId], references: [hub.id], relationName: "School_hub" }),
  assignedSupervisor: one(supervisor, {
    fields: [school.assignedSupervisorId],
    references: [supervisor.id],
    relationName: "School_assignedSupervisor",
  }),
  schoolFeedbacks: many(schoolFeedback, { relationName: "SchoolFeedback_School" }),
  schoolDropoutHistory: many(schoolDropoutHistory, { relationName: "SchoolDropoutHistory_school" }),
  interventionSessions: many(interventionSession, { relationName: "InterventionSession_school" }),
  interventionGroups: many(interventionGroup, { relationName: "InterventionGroup_school" }),
  sessionRecordings: many(sessionRecording, { relationName: "SessionRecording_school" }),
}));

export const schoolDropoutHistoryRelations = relations(schoolDropoutHistory, ({ one }) => ({
  user: one(user, {
    fields: [schoolDropoutHistory.userId],
    references: [user.id],
    relationName: "SchoolDropoutHistory_user",
  }),
  school: one(school, {
    fields: [schoolDropoutHistory.schoolId],
    references: [school.id],
    relationName: "SchoolDropoutHistory_school",
  }),
}));

export const schoolFeedbackRelations = relations(schoolFeedback, ({ one }) => ({
  School: one(school, {
    fields: [schoolFeedback.schoolId],
    references: [school.id],
    relationName: "SchoolFeedback_School",
  }),
  user: one(user, {
    fields: [schoolFeedback.userId],
    references: [user.id],
    relationName: "SchoolFeedback_user",
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
    relationName: "Session_user",
  }),
}));

export const sessionCommentRelations = relations(sessionComment, ({ one }) => ({
  session: one(interventionSession, {
    fields: [sessionComment.sessionId],
    references: [interventionSession.id],
    relationName: "SessionComment_session",
  }),
  user: one(user, {
    fields: [sessionComment.userId],
    references: [user.id],
    relationName: "SessionComment_user",
  }),
}));

export const sessionNameRelations = relations(sessionName, ({ one, many }) => ({
  InterventionSession: many(interventionSession, { relationName: "InterventionSession_session" }),
  hub: one(hub, {
    fields: [sessionName.hubId],
    references: [hub.id],
    relationName: "SessionName_hub",
  }),
}));

export const sessionRecordingRelations = relations(sessionRecording, ({ one }) => ({
  fellow: one(fellow, {
    fields: [sessionRecording.fellowId],
    references: [fellow.id],
    relationName: "SessionRecording_fellow",
  }),
  school: one(school, {
    fields: [sessionRecording.schoolId],
    references: [school.id],
    relationName: "SessionRecording_school",
  }),
  group: one(interventionGroup, {
    fields: [sessionRecording.groupId],
    references: [interventionGroup.id],
    relationName: "SessionRecording_group",
  }),
  session: one(interventionSession, {
    fields: [sessionRecording.sessionId],
    references: [interventionSession.id],
    relationName: "SessionRecording_session",
  }),
  uploader: one(user, {
    fields: [sessionRecording.uploadedBy],
    references: [user.id],
    relationName: "SessionRecording_uploader",
  }),
  supervisor: one(supervisor, {
    fields: [sessionRecording.supervisorId],
    references: [supervisor.id],
    relationName: "SessionRecording_supervisor",
  }),
}));

export const specialApprovalRequestsRelations = relations(
  specialApprovalRequests,
  ({ one, many }) => ({
    PayoutStatements: many(payoutStatements, {
      relationName: "PayoutStatements_specialPayoutRequest",
    }),
    hubCoordinator: one(hubCoordinator, {
      fields: [specialApprovalRequests.approvedBy],
      references: [hubCoordinator.id],
      relationName: "SpecialApprovalRequests_hubCoordinator",
    }),
    supervisor: one(supervisor, {
      fields: [specialApprovalRequests.createdBy],
      references: [supervisor.id],
      relationName: "SpecialApprovalRequests_supervisor",
    }),
    fellowAttendance: one(fellowAttendance, {
      fields: [specialApprovalRequests.fellowAttendanceId],
      references: [fellowAttendance.id],
      relationName: "SpecialApprovalRequests_fellowAttendance",
    }),
  }),
);

export const studentRelations = relations(student, ({ one, many }) => ({
  fellow: one(fellow, {
    fields: [student.fellowId],
    references: [fellow.id],
    relationName: "Student_fellow",
  }),
  supervisor: one(supervisor, {
    fields: [student.supervisorId],
    references: [supervisor.id],
    relationName: "Student_supervisor",
  }),
  implementer: one(implementer, {
    fields: [student.implementerId],
    references: [implementer.id],
    relationName: "Student_implementer",
  }),
  school: one(school, {
    fields: [student.schoolId],
    references: [school.id],
    relationName: "Student_school",
  }),
  assignedGroup: one(interventionGroup, {
    fields: [student.assignedGroupId],
    references: [interventionGroup.id],
    relationName: "Student_assignedGroup",
  }),
  studentAttendances: many(studentAttendance, { relationName: "StudentAttendance_student" }),
  triageEvents: many(triageEvent, { relationName: "TriageEvent_student" }),
  studentOutcome: many(studentOutcome, { relationName: "StudentOutcome_student" }),
  studentReportingNotes: many(studentReportingNotes, {
    relationName: "StudentReportingNotes_student",
  }),
  clinicalCases: many(clinicalScreeningInfo, { relationName: "ClinicalScreeningInfo_student" }),
  studentGroupTransferTrail: many(studentGroupTransferTrail, {
    relationName: "StudentGroupTransferTrail_student",
  }),
}));

export const studentAttendanceRelations = relations(studentAttendance, ({ one, many }) => ({
  project: one(project, {
    fields: [studentAttendance.projectId],
    references: [project.id],
    relationName: "StudentAttendance_project",
  }),
  student: one(student, {
    fields: [studentAttendance.studentId],
    references: [student.id],
    relationName: "StudentAttendance_student",
  }),
  session: one(interventionSession, {
    fields: [studentAttendance.sessionId],
    references: [interventionSession.id],
    relationName: "StudentAttendance_session",
  }),
  group: one(interventionGroup, {
    fields: [studentAttendance.groupId],
    references: [interventionGroup.id],
    relationName: "StudentAttendance_group",
  }),
  school: one(school, {
    fields: [studentAttendance.schoolId],
    references: [school.id],
    relationName: "StudentAttendance_school",
  }),
  fellow: one(fellow, {
    fields: [studentAttendance.fellowId],
    references: [fellow.id],
    relationName: "StudentAttendance_fellow",
  }),
  user: one(user, {
    fields: [studentAttendance.markedBy],
    references: [user.id],
    relationName: "StudentAttendance_user",
  }),
  triageEvents: many(triageEvent, { relationName: "TriageEvent_studentAttendance" }),
}));

export const studentGroupTransferTrailRelations = relations(
  studentGroupTransferTrail,
  ({ one }) => ({
    student: one(student, {
      fields: [studentGroupTransferTrail.studentId],
      references: [student.id],
      relationName: "StudentGroupTransferTrail_student",
    }),
    fromGroup: one(interventionGroup, {
      fields: [studentGroupTransferTrail.fromGroupId],
      references: [interventionGroup.id],
      relationName: "StudentGroupTransferTrail_fromGroup",
    }),
  }),
);

export const studentOutcomeRelations = relations(studentOutcome, ({ one }) => ({
  student: one(student, {
    fields: [studentOutcome.shamiriId],
    references: [student.visibleId],
    relationName: "StudentOutcome_student",
  }),
  implementer: one(implementer, {
    fields: [studentOutcome.implementerId],
    references: [implementer.visibleId],
    relationName: "StudentOutcome_implementer",
  }),
}));

export const studentReportingNotesRelations = relations(studentReportingNotes, ({ one }) => ({
  supervisor: one(supervisor, {
    fields: [studentReportingNotes.supervisorId],
    references: [supervisor.id],
    relationName: "StudentReportingNotes_supervisor",
  }),
  student: one(student, {
    fields: [studentReportingNotes.studentId],
    references: [student.id],
    relationName: "StudentReportingNotes_student",
  }),
  user: one(user, {
    fields: [studentReportingNotes.addedBy],
    references: [user.id],
    relationName: "StudentReportingNotes_user",
  }),
}));

export const supervisorRelations = relations(supervisor, ({ one, many }) => ({
  students: many(student, { relationName: "Student_supervisor" }),
  triageEventsReferred: many(triageEvent, { relationName: "TriageEvent_referredSupervisor" }),
  fellows: many(fellow, { relationName: "Fellow_supervisor" }),
  fellowAttendances: many(fellowAttendance, { relationName: "FellowAttendance_supervisor" }),
  hub: one(hub, {
    fields: [supervisor.hubId],
    references: [hub.id],
    relationName: "Supervisor_hub",
  }),
  implementer: one(implementer, {
    fields: [supervisor.implementerId],
    references: [implementer.id],
    relationName: "Supervisor_implementer",
  }),
  supervisorAttendances: many(supervisorAttendance, {
    relationName: "SupervisorAttendance_supervisor",
  }),
  supervisorComplaints: many(supervisorComplaints, {
    relationName: "SupervisorComplaints_supervisor",
  }),
  monthlySupervisorEvaluation: many(monthlySupervisorEvaluation, {
    relationName: "MonthlySupervisorEvaluation_supervisor",
  }),
  assignedSchools: many(school, { relationName: "School_assignedSupervisor" }),
  sessionRatings: many(interventionSessionRating, {
    relationName: "InterventionSessionRating_supervisor",
  }),
  sessionNotes: many(interventionSessionNote, {
    relationName: "InterventionSessionNote_supervisor",
  }),
  reimbursementRequests: many(reimbursementRequest, {
    relationName: "ReimbursementRequest_supervisor",
  }),
  repaymentRequests: many(repaymentRequest, { relationName: "RepaymentRequest_supervisor" }),
  studentReportingNotes: many(studentReportingNotes, {
    relationName: "StudentReportingNotes_supervisor",
  }),
  fellowReportingNotes: many(fellowReportingNotes, {
    relationName: "FellowReportingNotes_supervisor",
  }),
  overallFellowEvaluation: many(overallFellowEvaluation, {
    relationName: "OverallFellowEvaluation_supervisor",
  }),
  clinicalScreeningCases: many(clinicalScreeningInfo, {
    relationName: "ClinicalScreeningInfo_currentSupervisor",
  }),
  referredToMeClinicalCases: many(clinicalScreeningInfo, { relationName: "referredtocases" }),
  fellowComplaints: many(fellowComplaints, { relationName: "FellowComplaints_supervisor" }),
  weeklyFellowRatings: many(weeklyFellowRatings, {
    relationName: "WeeklyFellowRatings_supervisor",
  }),
  delayedPaymentRequests: many(delayedPaymentRequest, {
    relationName: "DelayedPaymentRequest_supervisor",
  }),
  SpecialApprovalRequests: many(specialApprovalRequests, {
    relationName: "SpecialApprovalRequests_supervisor",
  }),
  sessionRecordings: many(sessionRecording, { relationName: "SessionRecording_supervisor" }),
}));

export const supervisorAttendanceRelations = relations(supervisorAttendance, ({ one }) => ({
  project: one(project, {
    fields: [supervisorAttendance.projectId],
    references: [project.id],
    relationName: "SupervisorAttendance_project",
  }),
  school: one(school, {
    fields: [supervisorAttendance.schoolId],
    references: [school.id],
    relationName: "SupervisorAttendance_school",
  }),
  supervisor: one(supervisor, {
    fields: [supervisorAttendance.supervisorId],
    references: [supervisor.id],
    relationName: "SupervisorAttendance_supervisor",
  }),
  session: one(interventionSession, {
    fields: [supervisorAttendance.sessionId],
    references: [interventionSession.id],
    relationName: "SupervisorAttendance_session",
  }),
  user: one(user, {
    fields: [supervisorAttendance.markedBy],
    references: [user.id],
    relationName: "SupervisorAttendance_user",
  }),
}));

export const supervisorComplaintsRelations = relations(supervisorComplaints, ({ one }) => ({
  project: one(project, {
    fields: [supervisorComplaints.projectId],
    references: [project.id],
    relationName: "SupervisorComplaints_project",
  }),
  supervisor: one(supervisor, {
    fields: [supervisorComplaints.supervisorId],
    references: [supervisor.id],
    relationName: "SupervisorComplaints_supervisor",
  }),
  hubCoordinator: one(hubCoordinator, {
    fields: [supervisorComplaints.hubCoordinatorId],
    references: [hubCoordinator.id],
    relationName: "SupervisorComplaints_hubCoordinator",
  }),
}));

export const ticketEscalationsRelations = relations(ticketEscalations, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketEscalations.ticketId],
    references: [tickets.id],
    relationName: "TicketEscalations_ticket",
  }),
  escalatedByUser: one(user, {
    fields: [ticketEscalations.escalatedById],
    references: [user.id],
    relationName: "EscalatedByUser",
  }),
  escalatedToUser: one(user, {
    fields: [ticketEscalations.escalatedToId],
    references: [user.id],
    relationName: "EscalatedToUser",
  }),
  reassignments: one(ticketReassignments),
}));

export const ticketReassignmentsRelations = relations(ticketReassignments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketReassignments.ticketId],
    references: [tickets.id],
    relationName: "TicketReassignments_ticket",
  }),
  escalation: one(ticketEscalations, {
    fields: [ticketReassignments.escalationId],
    references: [ticketEscalations.id],
  }),
  reassignedFromUser: one(user, {
    fields: [ticketReassignments.reassignedFrom],
    references: [user.id],
    relationName: "reassignedFromUser",
  }),
  reassignedToUser: one(user, {
    fields: [ticketReassignments.reassignedTo],
    references: [user.id],
    relationName: "reassignedToUser",
  }),
}));

export const ticketResolutionsRelations = relations(ticketResolutions, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketResolutions.ticketId],
    references: [tickets.id],
    relationName: "TicketResolutions_ticket",
  }),
  resolvedByUser: one(user, {
    fields: [ticketResolutions.resolvedById],
    references: [user.id],
    relationName: "resolvedByUser",
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  creator: one(user, {
    fields: [tickets.createdById],
    references: [user.id],
    relationName: "Tickets_creator",
  }),
  escalations: many(ticketEscalations, { relationName: "TicketEscalations_ticket" }),
  resolutions: many(ticketResolutions, { relationName: "TicketResolutions_ticket" }),
  reassignments: many(ticketReassignments, { relationName: "TicketReassignments_ticket" }),
}));

export const triageEventRelations = relations(triageEvent, ({ one, many }) => ({
  studentAttendance: one(studentAttendance, {
    fields: [triageEvent.studentAttendanceId],
    references: [studentAttendance.id],
    relationName: "TriageEvent_studentAttendance",
  }),
  session: one(interventionSession, {
    fields: [triageEvent.sessionId],
    references: [interventionSession.id],
    relationName: "TriageEvent_session",
  }),
  student: one(student, {
    fields: [triageEvent.studentId],
    references: [student.id],
    relationName: "TriageEvent_student",
  }),
  fellow: one(fellow, {
    fields: [triageEvent.fellowId],
    references: [fellow.id],
    relationName: "TriageEvent_fellow",
  }),
  hub: one(hub, {
    fields: [triageEvent.hubId],
    references: [hub.id],
    relationName: "TriageEvent_hub",
  }),
  referredSupervisor: one(supervisor, {
    fields: [triageEvent.referredSupervisorId],
    references: [supervisor.id],
    relationName: "TriageEvent_referredSupervisor",
  }),
  reviewedBy: one(user, {
    fields: [triageEvent.reviewedById],
    references: [user.id],
    relationName: "TriageEventReviewer",
  }),
  auditTrail: many(triageEventAudit, { relationName: "TriageEventAudit_triageEvent" }),
}));

export const triageEventAuditRelations = relations(triageEventAudit, ({ one }) => ({
  triageEvent: one(triageEvent, {
    fields: [triageEventAudit.triageEventId],
    references: [triageEvent.id],
    relationName: "TriageEventAudit_triageEvent",
  }),
  editedBy: one(user, {
    fields: [triageEventAudit.editedById],
    references: [user.id],
    relationName: "TriageEventAudit_editedBy",
  }),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  activeProject: one(project, {
    fields: [user.activeProjectId],
    references: [project.id],
    relationName: "UserActiveProject",
  }),
  accounts: many(account, { relationName: "Account_user" }),
  sessions: many(session, { relationName: "Session_user" }),
  recentOpens: many(userRecentOpen, { relationName: "UserRecentOpen_user" }),
  avatar: one(userAvatar),
  memberships: many(implementerMember, { relationName: "ImplementerMember_user" }),
  studentAttendance: many(studentAttendance, { relationName: "StudentAttendance_user" }),
  reviewedTriageEvents: many(triageEvent, { relationName: "TriageEventReviewer" }),
  triageEventAudits: many(triageEventAudit, { relationName: "TriageEventAudit_editedBy" }),
  fellowAttendance: many(fellowAttendance, { relationName: "FellowAttendance_user" }),
  supervisorAttendance: many(supervisorAttendance, { relationName: "SupervisorAttendance_user" }),
  schoolFeedbacks: many(schoolFeedback, { relationName: "SchoolFeedback_user" }),
  schoolDropoutHistory: many(schoolDropoutHistory, { relationName: "SchoolDropoutHistory_user" }),
  sessionComment: many(sessionComment, { relationName: "SessionComment_user" }),
  studentReportingNotes: many(studentReportingNotes, {
    relationName: "StudentReportingNotes_user",
  }),
  FellowComplaints: many(fellowComplaints, { relationName: "FellowComplaints_user" }),
  payoutStatements: many(payoutStatements, { relationName: "PayoutStatements_user" }),
  confirmedPayouts: many(payoutStatements, { relationName: "payout_statements_confirmed_by" }),
  clinicalFollowUpTreatmentPlanAuditTrail: many(clinicalFollowUpTreatmentPlanAuditTrail, {
    relationName: "ClinicalFollowUpTreatmentPlanAuditTrail_user",
  }),
  clinicalCaseNotes: many(clinicalCaseNotes, { relationName: "ClinicalCaseNotes_user" }),
  clinicalCaseTermination: many(clinicalCaseTermination, {
    relationName: "ClinicalCaseTermination_user",
  }),
  sessionRecordings: many(sessionRecording, { relationName: "SessionRecording_uploader" }),
  attendanceDocuments: many(attendanceDocuments, { relationName: "AttendanceDocuments_user" }),
  tickets: many(tickets, { relationName: "Tickets_creator" }),
  escalationsMade: many(ticketEscalations, { relationName: "EscalatedByUser" }),
  escalationsReceived: many(ticketEscalations, { relationName: "EscalatedToUser" }),
  resolvedTickets: many(ticketResolutions, { relationName: "resolvedByUser" }),
  reassignmentsMade: many(ticketReassignments, { relationName: "reassignedFromUser" }),
  reassignmentsReceived: many(ticketReassignments, { relationName: "reassignedToUser" }),
}));

export const userAvatarRelations = relations(userAvatar, ({ one }) => ({
  user: one(user, { fields: [userAvatar.userId], references: [user.id] }),
  file: one(file, { fields: [userAvatar.fileId], references: [file.id] }),
}));

export const userRecentOpenRelations = relations(userRecentOpen, ({ one }) => ({
  user: one(user, {
    fields: [userRecentOpen.userId],
    references: [user.id],
    relationName: "UserRecentOpen_user",
  }),
}));

export const weeklyFellowRatingsRelations = relations(weeklyFellowRatings, ({ one }) => ({
  fellow: one(fellow, {
    fields: [weeklyFellowRatings.fellowId],
    references: [fellow.id],
    relationName: "WeeklyFellowRatings_fellow",
  }),
  supervisor: one(supervisor, {
    fields: [weeklyFellowRatings.supervisorId],
    references: [supervisor.id],
    relationName: "WeeklyFellowRatings_supervisor",
  }),
}));

export const weeklyHubReportRelations = relations(weeklyHubReport, ({ one }) => ({
  hubCoordinator: one(hubCoordinator, {
    fields: [weeklyHubReport.submittedBy],
    references: [hubCoordinator.id],
    relationName: "WeeklyHubReport_hubCoordinator",
  }),
  hub: one(hub, {
    fields: [weeklyHubReport.hubId],
    references: [hub.id],
    relationName: "WeeklyHubReport_hub",
  }),
}));

export const weeklyTeamMeetingReportRelations = relations(weeklyTeamMeetingReport, ({ one }) => ({
  hubCoordinator: one(hubCoordinator, {
    fields: [weeklyTeamMeetingReport.submittedBy],
    references: [hubCoordinator.id],
    relationName: "WeeklyTeamMeetingReport_hubCoordinator",
  }),
  hub: one(hub, {
    fields: [weeklyTeamMeetingReport.hubId],
    references: [hub.id],
    relationName: "WeeklyTeamMeetingReport_hub",
  }),
}));
