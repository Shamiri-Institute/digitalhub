import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import {
  AdaptationType,
  ApprovalStatus,
  FollowUpPlanOptions,
  GroupType,
  ImplementerRole,
  QuestionnaireType,
  RecordingProcessingStatus,
  RiskNotCompletedReason,
  RiskScreenOutcome,
  SessionStatus,
  SupervisorHandoffStatus,
  SupportType,
  TicketCategory,
  TicketPriorityLevel,
  TicketStatus,
  TriageActionTaken,
  caseStatusOptions,
  referralStatusOptions,
  riskStatusOptions,
  sessionTypes,
  enumValues,
} from "./enums";

// Same shape as Prisma's JsonValue (object members may be undefined) so rows from either client interchange.
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };
export const followUpPlanOptionsEnum = pgEnum(
  "FollowUpPlanOptions",
  enumValues(FollowUpPlanOptions),
);
export const groupTypeEnum = pgEnum("GroupType", enumValues(GroupType));
export const sessionStatusEnum = pgEnum("SessionStatus", enumValues(SessionStatus));
export const adaptationTypeEnum = pgEnum("adaptation_types", enumValues(AdaptationType));
export const approvalStatusEnum = pgEnum("approval_status", enumValues(ApprovalStatus));
export const caseStatusOptionsEnum = pgEnum("caseStatusOptions", enumValues(caseStatusOptions));
export const implementerRoleEnum = pgEnum("implementer_roles", enumValues(ImplementerRole));
export const questionnaireTypeEnum = pgEnum("questionnaire_types", enumValues(QuestionnaireType));
export const recordingProcessingStatusEnum = pgEnum(
  "recording_processing_status",
  enumValues(RecordingProcessingStatus),
);
export const referralStatusOptionsEnum = pgEnum(
  "referralStatusOptions",
  enumValues(referralStatusOptions),
);
export const riskStatusOptionsEnum = pgEnum("riskStatusOptions", enumValues(riskStatusOptions));
export const riskNotCompletedReasonEnum = pgEnum(
  "risk_not_completed_reasons",
  enumValues(RiskNotCompletedReason),
);
export const riskScreenOutcomeEnum = pgEnum("risk_screen_outcomes", enumValues(RiskScreenOutcome));
export const sessionTypesEnum = pgEnum("session_types", enumValues(sessionTypes));
export const supervisorHandoffStatusEnum = pgEnum(
  "supervisor_handoff_statuses",
  enumValues(SupervisorHandoffStatus),
);
export const supportTypeEnum = pgEnum("support_types", enumValues(SupportType));
export const ticketCategoryEnum = pgEnum("ticket_category", enumValues(TicketCategory));
export const ticketPriorityLevelEnum = pgEnum(
  "ticket_priority_level",
  enumValues(TicketPriorityLevel),
);
export const ticketStatusEnum = pgEnum("ticket_status", enumValues(TicketStatus));
export const triageActionTakenEnum = pgEnum("triage_action_taken", enumValues(TriageActionTaken));

export const verificationToken = pgTable(
  "verification_tokens",
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("verification_tokens_identifier_token_key").using(
      "btree",
      table.identifier,
      table.token,
    ),
    uniqueIndex("verification_tokens_token_key").using("btree", table.token),
  ],
);

export const account = pgTable(
  "accounts",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id").notNull(),
    type: text().notNull(),
    provider: text().notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text(),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    uniqueIndex("accounts_provider_provider_account_id_key").using(
      "btree",
      table.provider,
      table.providerAccountId,
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "accounts_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const session = pgTable(
  "sessions",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    sessionToken: text("session_token").notNull(),
    userId: text("user_id").notNull(),
    expires: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("sessions_session_token_key").using("btree", table.sessionToken),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "sessions_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const implementer = pgTable(
  "implementers",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    visibleId: varchar("visible_id", { length: 100 }).notNull(),
    implementerName: text("implementer_name").notNull(),
    implementerType: text("implementer_type").notNull(),
    implementerAddress: text("implementer_address"),
    countyOfOperation: text("county_of_operation"),
    pointPersonName: text("point_person_name"),
    pointPersonPhone: text("point_person_phone"),
    pointPersonEmail: text("point_person_email"),
  },
  (table) => [
    // A constraint, not uniqueIndex(): student_outcomes.implementer_id references this column and
    // drizzle-kit creates foreign keys before indexes.
    unique("implementers_visible_id_key").on(table.visibleId),
  ],
);

export const implementerAvatar = pgTable(
  "implementer_avatars",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    implementerId: text("implementer_id").notNull(),
    fileId: text("file_id").notNull(),
  },
  (table) => [
    uniqueIndex("implementer_avatars_file_id_key").using("btree", table.fileId),
    uniqueIndex("implementer_avatars_implementer_id_key").using("btree", table.implementerId),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "implementer_avatars_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.fileId],
      foreignColumns: [file.id],
      name: "implementer_avatars_file_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const file = pgTable("files", {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
  archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
  key: text().notNull(),
  fileName: text("file_name").notNull(),
  byteSize: integer("byte_size").notNull(),
  contentType: text("content_type").notNull(),
  width: integer(),
  height: integer(),
  signedUrl: varchar("signed_url", { length: 2048 }),
  expiresAt: timestamp("expires_at", { precision: 3, mode: "date" }),
});

export const userRecentOpen = pgTable(
  "user_recent_opens",
  {
    id: serial().primaryKey().notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    itemId: text("item_id").notNull(),
    openedAt: timestamp("opened_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("user_recent_opens_user_id_item_id_idx").using("btree", table.userId, table.itemId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "user_recent_opens_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const userAvatar = pgTable(
  "user_avatars",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    userId: text("user_id").notNull(),
    fileId: text("file_id").notNull(),
  },
  (table) => [
    uniqueIndex("user_avatars_file_id_key").using("btree", table.fileId),
    uniqueIndex("user_avatars_user_id_key").using("btree", table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "user_avatars_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.fileId],
      foreignColumns: [file.id],
      name: "user_avatars_file_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const interventionSessionRating = pgTable(
  "intervention_session_ratings",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
    studentBehaviorRating: integer("student_behavior_rating"),
    adminSupportRating: integer("admin_support_rating"),
    workloadRating: integer("workload_rating"),
    challenges: text(),
    positiveHighlights: text("positive_highlights"),
    recommendations: text(),
    headcount: integer(),
  },
  (table) => [
    uniqueIndex("intervention_session_ratings_session_id_supervisor_id_key").using(
      "btree",
      table.sessionId,
      table.supervisorId,
    ),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [interventionSession.id],
      name: "intervention_session_ratings_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "intervention_session_ratings_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const reimbursementRequest = pgTable(
  "reimbursement_requests",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    kind: varchar({ length: 255 }).notNull(),
    status: varchar({ length: 100 }).default("pending").notNull(),
    details: jsonb().$type<JsonValue>().notNull(),
    hubId: varchar("hub_id", { length: 255 }).notNull(),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
    incurredAt: timestamp("incurred_at", { withTimezone: true, mode: "date" }).notNull(),
    amount: integer().notNull(),
    currency: varchar({ length: 10 }).default("KES").notNull(),
    hubCoordinatorId: varchar("hub_coordinator_id", { length: 255 }),
    mpesaName: varchar("mpesa_name", { length: 255 }).notNull(),
    mpesaNumber: varchar("mpesa_number", { length: 20 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "reimbursement_requests_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.hubId],
      foreignColumns: [hub.id],
      name: "reimbursement_requests_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.hubCoordinatorId],
      foreignColumns: [hubCoordinator.id],
      name: "reimbursement_requests_hub_coordinator_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const student = pgTable(
  "students",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    studentName: varchar("student_name", { length: 255 }),
    visibleId: varchar("visible_id", { length: 100 }).notNull(),
    fellowId: varchar("fellow_id", { length: 255 }),
    supervisorId: varchar("supervisor_id", { length: 255 }),
    implementerId: varchar("implementer_id", { length: 255 }),
    schoolId: varchar("school_id", { length: 255 }),
    yearOfImplementation: integer("year_of_implementation"),
    admissionNumber: varchar("admission_number", { length: 255 }),
    age: integer(),
    gender: varchar({ length: 10 }),
    form: integer(),
    stream: varchar({ length: 255 }),
    condition: varchar({ length: 255 }),
    intervention: varchar({ length: 255 }),
    tribe: varchar({ length: 255 }),
    county: varchar({ length: 255 }),
    financialStatus: varchar("financial_status", { length: 255 }),
    home: varchar({ length: 255 }),
    siblings: varchar({ length: 255 }),
    religion: varchar({ length: 255 }),
    groupName: varchar("group_name", { length: 255 }),
    survivingParents: varchar("surviving_parents", { length: 255 }),
    parentsDead: varchar("parents_dead", { length: 255 }),
    fathersEducation: varchar("fathers_education", { length: 255 }),
    mothersEducation: varchar("mothers_education", { length: 255 }),
    coCurricular: varchar("co_curricular", { length: 255 }),
    sports: varchar({ length: 255 }),
    isClinicalCase: boolean("is_clinical_case"),
    phoneNumber: varchar("phone_number", { length: 255 }),
    mpesaNumber: varchar("mpesa_number", { length: 255 }),
    droppedOut: boolean("dropped_out"),
    dropOutReason: text("drop_out_reason"),
    droppedOutAt: timestamp("dropped_out_at", { withTimezone: true, mode: "date" }),
    assignedGroupId: text("assigned_group_id"),
    yearOfBirth: integer("year_of_birth"),
    questionnaireType: questionnaireTypeEnum("questionnaire_type"),
  },
  (table) => [
    index("students_assigned_group_id_idx").using("btree", table.assignedGroupId),
    index("students_school_id_idx").using("btree", table.schoolId),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "students_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "students_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "students_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [school.id],
      name: "students_school_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.assignedGroupId],
      foreignColumns: [interventionGroup.id],
      name: "students_assigned_group_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    // A constraint, not uniqueIndex(): student_outcomes.shamiri_id references this column and
    // drizzle-kit creates foreign keys before indexes.
    unique("students_visible_id_key").on(table.visibleId),
  ],
);

export const interventionSessionNote = pgTable(
  "intervention_session_notes",
  {
    id: serial().primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    kind: varchar({ length: 255 }).notNull(),
    content: text().notNull(),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [interventionSession.id],
      name: "intervention_session_notes_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "intervention_session_notes_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const hub = pgTable(
  "hubs",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    visibleId: varchar("visible_id", { length: 100 }).notNull(),
    hubName: varchar("hub_name", { length: 255 }).notNull(),
    implementerId: varchar("implementer_id", { length: 255 }).notNull(),
    projectId: varchar("project_id", { length: 100 }),
  },
  (table) => [
    uniqueIndex("hubs_visible_id_key").using("btree", table.visibleId),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "hubs_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "hubs_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const fellowAttendance = pgTable(
  "fellow_attendances",
  {
    id: serial().primaryKey().notNull(),
    visibleId: varchar("visible_id", { length: 100 }),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    sessionNumber: integer("session_number"),
    sessionDate: timestamp("session_date", { precision: 3, mode: "date" }),
    yearOfImplementation: integer("year_of_implementation"),
    schoolId: varchar("school_id", { length: 255 }),
    supervisorId: varchar("supervisor_id", { length: 255 }),
    attended: boolean(),
    absenceReason: text("absence_reason"),
    paymentInitiated: boolean("payment_initiated"),
    groupId: varchar("group_id", { length: 255 }),
    projectId: text("project_id"),
    sessionId: text("session_id"),
    processedAt: timestamp("processed_at", { precision: 3, mode: "date" }),
    absenceComments: text("absence_comments"),
    markedBy: text("marked_by"),
  },
  (table) => [
    uniqueIndex("fellow_attendances_visible_id_key").using("btree", table.visibleId),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "fellow_attendances_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "fellow_attendances_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [interventionSession.id],
      name: "fellow_attendances_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [interventionGroup.id],
      name: "fellow_attendances_group_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.markedBy],
      foreignColumns: [user.id],
      name: "fellow_attendances_marked_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [school.id],
      name: "fellow_attendances_school_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "fellow_attendances_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const fellow = pgTable(
  "fellows",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    visibleId: varchar("visible_id", { length: 100 }),
    fellowName: varchar("fellow_name", { length: 255 }),
    fellowEmail: varchar("fellow_email", { length: 255 }),
    yearOfImplementation: integer("year_of_implementation"),
    mpesaName: varchar("mpesa_name", { length: 255 }),
    mpesaNumber: varchar("mpesa_number", { length: 255 }),
    idNumber: varchar("id_number", { length: 255 }),
    cellNumber: varchar("cell_number", { length: 255 }),
    county: varchar({ length: 255 }),
    subCounty: varchar("sub_county", { length: 255 }),
    dateOfBirth: date("date_of_birth", { mode: "date" }),
    gender: text(),
    transferred: boolean(),
    hubId: varchar("hub_id", { length: 255 }),
    implementerId: varchar("implementer_id", { length: 255 }),
    supervisorId: varchar("supervisor_id", { length: 255 }),
    droppedOut: boolean("dropped_out"),
    dropOutReason: text("drop_out_reason"),
    droppedOutAt: timestamp("dropped_out_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("fellows_hub_id_idx").using("btree", table.hubId),
    foreignKey({
      columns: [table.hubId],
      foreignColumns: [hub.id],
      name: "fellows_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "fellows_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "fellows_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const implementerInvite = pgTable(
  "implementer_invites",
  {
    id: serial().primaryKey().notNull(),
    email: text().notNull(),
    implementerId: varchar("implementer_id", { length: 255 }).notNull(),
    sentAt: timestamp("sent_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: timestamp("expires_at", { precision: 3, mode: "date" }).notNull(),
    acceptedAt: timestamp("accepted_at", { precision: 3, mode: "date" }),
    secureToken: text("secure_token").notNull(),
    implementerRole: implementerRoleEnum("implementer_role").notNull(),
  },
  (table) => [
    uniqueIndex("implementer_invites_email_implementer_id_secure_token_key").using(
      "btree",
      table.email,
      table.implementerId,
      table.secureToken,
    ),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "implementer_invites_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const hubCoordinator = pgTable(
  "hub_coordinators",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    visibleId: varchar("visible_id", { length: 100 }).notNull(),
    coordinatorName: varchar("coordinator_name", { length: 255 }).notNull(),
    coordinatorEmail: varchar("coordinator_email", { length: 255 }),
    idNumber: varchar("id_number", { length: 255 }),
    cellNumber: varchar("cell_number", { length: 255 }),
    mpesaNumber: varchar("mpesa_number", { length: 255 }),
    implementerId: varchar("implementer_id", { length: 255 }).notNull(),
    county: varchar({ length: 255 }),
    subCounty: varchar("sub_county", { length: 255 }),
    bankName: varchar("bank_name", { length: 255 }),
    bankBranch: varchar("bank_branch", { length: 255 }),
    bankAccountNumber: varchar("bank_account_number", { length: 255 }),
    bankAccountName: varchar("bank_account_name", { length: 255 }),
    kra: varchar({ length: 255 }),
    nhif: varchar({ length: 255 }),
    dateOfBirth: date("date_of_birth", { mode: "date" }),
    gender: varchar({ length: 10 }),
    trainingLevel: varchar("training_level", { length: 255 }),
    droppedOut: boolean("dropped_out"),
    assignedHubId: varchar("assigned_hub_id", { length: 255 }),
  },
  (table) => [
    uniqueIndex("hub_coordinators_coordinator_email_key").using("btree", table.coordinatorEmail),
    uniqueIndex("hub_coordinators_visible_id_key").using("btree", table.visibleId),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "hub_coordinators_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.assignedHubId],
      foreignColumns: [hub.id],
      name: "hub_coordinators_assigned_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const school = pgTable(
  "schools",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    schoolName: varchar("school_name", { length: 255 }).notNull(),
    schoolType: varchar("school_type", { length: 255 }),
    schoolEmail: varchar("school_email", { length: 255 }),
    schoolCounty: varchar("school_county", { length: 255 }),
    schoolDemographics: varchar("school_demographics", { length: 255 }),
    visibleId: varchar("visible_id", { length: 100 }).notNull(),
    implementerId: varchar("implementer_id", { length: 255 }),
    hubId: varchar("hub_id", { length: 255 }),
    pointPersonName: varchar("point_person_name", { length: 255 }),
    pointPersonId: varchar("point_person_id", { length: 255 }),
    pointPersonPhone: varchar("point_person_phone", { length: 255 }),
    pointPersonEmail: varchar("point_person_email", { length: 255 }),
    numbersExpected: integer("numbers_expected"),
    boardingDay: varchar("boarding_day", { length: 255 }),
    longitude: doublePrecision(),
    latitude: doublePrecision(),
    droppedOut: boolean("dropped_out"),
    preSessionDate: timestamp("pre_session_date", { precision: 3, mode: "date" }),
    session1Date: timestamp("session_1_date", { precision: 3, mode: "date" }),
    session2Date: timestamp("session_2_date", { precision: 3, mode: "date" }),
    session3Date: timestamp("session_3_date", { precision: 3, mode: "date" }),
    session4Date: timestamp("session_4_date", { precision: 3, mode: "date" }),
    clinicalFollowup1Date: timestamp("clinical_followup_1_date", { precision: 3, mode: "date" }),
    clinicalFollowup2Date: timestamp("clinical_followup_2_date", { precision: 3, mode: "date" }),
    clinicalFollowup3Date: timestamp("clinical_followup_3_date", { precision: 3, mode: "date" }),
    clinicalFollowup4Date: timestamp("clinical_followup_4_date", { precision: 3, mode: "date" }),
    clinicalFollowup5Date: timestamp("clinical_followup_5_date", { precision: 3, mode: "date" }),
    clinicalFollowup6Date: timestamp("clinical_followup_6_date", { precision: 3, mode: "date" }),
    clinicalFollowup7Date: timestamp("clinical_followup_7_date", { precision: 3, mode: "date" }),
    clinicalFollowup8Date: timestamp("clinical_followup_8_date", { precision: 3, mode: "date" }),
    dataCollectionFollowup1Date: timestamp("data_collection_followup_1_date", {
      precision: 3,
      mode: "date",
    }),
    dropoutReason: text("dropout_reason"),
    principalName: text("principal_name"),
    principalPhone: text("principal_phone"),
    assignedSupervisorId: varchar("assigned_supervisor_id", { length: 255 }),
    schoolSubCounty: varchar("school_sub_county", { length: 255 }),
    droppedOutAt: timestamp("dropped_out_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("schools_visible_id_key").using("btree", table.visibleId),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "schools_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.hubId],
      foreignColumns: [hub.id],
      name: "schools_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.assignedSupervisorId],
      foreignColumns: [supervisor.id],
      name: "schools_assigned_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const interventionSession = pgTable(
  "intervention_sessions",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    sessionName: varchar("session_name", { length: 255 }),
    sessionType: varchar("session_type", { length: 255 }),
    schoolId: varchar("school_id", { length: 255 }),
    occurred: boolean().notNull(),
    yearOfImplementation: integer("year_of_implementation").notNull(),
    projectId: varchar("project_id", { length: 100 }),
    scheduleHistory: jsonb("schedule_history").$type<JsonValue>(),
    sessionEndTime: timestamp("session_end_time", { precision: 3, mode: "date" }),
    status: sessionStatusEnum().default("Scheduled"),
    sessionId: varchar("session_id", { length: 255 }),
    venue: text(),
    sessionDate: timestamp("session_date", {
      precision: 6,
      withTimezone: true,
      mode: "date",
    }).notNull(),
    hubId: varchar("hub_id", { length: 255 }),
  },
  (table) => [
    index("intervention_sessions_school_id_idx").using("btree", table.schoolId),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "intervention_sessions_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [sessionName.id],
      name: "intervention_sessions_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [school.id],
      name: "intervention_sessions_school_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.hubId],
      foreignColumns: [hub.id],
      name: "intervention_sessions_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const supervisor = pgTable(
  "supervisors",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    hubId: varchar("hub_id", { length: 255 }),
    visibleId: varchar("visible_id", { length: 100 }),
    supervisorName: varchar("supervisor_name", { length: 255 }),
    supervisorEmail: varchar("supervisor_email", { length: 255 }),
    idNumber: varchar("id_number", { length: 255 }),
    cellNumber: varchar("cell_number", { length: 255 }),
    mpesaNumber: varchar("mpesa_number", { length: 20 }),
    implementerId: varchar("implementer_id", { length: 255 }).notNull(),
    county: varchar({ length: 255 }),
    subCounty: varchar("sub_county", { length: 255 }),
    bankName: varchar("bank_name", { length: 255 }),
    bankBranch: varchar("bank_branch", { length: 255 }),
    bankAccountName: varchar("bank_account_name", { length: 255 }),
    bankAccountNumber: varchar("bank_account_number", { length: 255 }),
    kra: varchar({ length: 255 }),
    nhif: varchar({ length: 255 }),
    nssf: varchar({ length: 255 }),
    dateOfBirth: date("date_of_birth", { mode: "date" }),
    gender: varchar({ length: 10 }),
    trainingLevel: varchar("training_level", { length: 255 }),
    droppedOut: boolean("dropped_out"),
    mpesaName: varchar("mpesa_name", { length: 255 }),
    personalEmail: varchar("personal_email", { length: 255 }),
    dropOutReason: text("drop_out_reason"),
  },
  (table) => [
    uniqueIndex("supervisors_visible_id_key").using("btree", table.visibleId),
    foreignKey({
      columns: [table.hubId],
      foreignColumns: [hub.id],
      name: "supervisors_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "supervisors_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const user = pgTable(
  "users",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    name: text(),
    email: text(),
    emailVerified: timestamp("email_verified", { precision: 3, mode: "date" }),
    image: text(),
    activeProjectId: varchar("active_project_id", { length: 255 }),
  },
  (table) => [
    uniqueIndex("users_email_key").using("btree", table.email),
    foreignKey({
      columns: [table.activeProjectId],
      foreignColumns: [project.id],
      name: "users_active_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const studentOutcome = pgTable(
  "student_outcomes",
  {
    id: text().primaryKey().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    shamiriId: text("shamiri_id"),
    timePoint: integer("time_point").notNull(),
    yearOfImplementation: integer("year_of_implementation").notNull(),
    date: date("date", { mode: "date" }),
    condition: text().notNull(),
    implementerId: text("implementer_id"),
    phq1: integer("phq_1"),
    phq2: integer("phq_2"),
    phq3: integer("phq_3"),
    phq4: integer("phq_4"),
    phq5: integer("phq_5"),
    phq6: integer("phq_6"),
    phq7: integer("phq_7"),
    phq8: integer("phq_8"),
    phqFunctioning: integer("phq_functioning"),
    gad1: integer("gad_1"),
    gad2: integer("gad_2"),
    gad3: integer("gad_3"),
    gad4: integer("gad_4"),
    gad5: integer("gad_5"),
    gad6: integer("gad_6"),
    gad7: integer("gad_7"),
    gadFunctioning: integer("gad_functioning"),
    mspss1: integer("mspss_1"),
    mspss2: integer("mspss_2"),
    mspss3: integer("mspss_3"),
    mspss4: integer("mspss_4"),
    mspss5: integer("mspss_5"),
    mspss6: integer("mspss_6"),
    mspss7: integer("mspss_7"),
    mspss8: integer("mspss_8"),
    mspss9: integer("mspss_9"),
    mspss10: integer("mspss_10"),
    mspss11: integer("mspss_11"),
    mspss12: integer("mspss_12"),
    gq1: integer("gq_1"),
    gq2: integer("gq_2"),
    gq3: integer("gq_3"),
    gq4: integer("gq_4"),
    gq5: integer("gq_5"),
    gq6: integer("gq_6"),
    pcs1: integer("pcs_1"),
    pcs2: integer("pcs_2"),
    pcs3: integer("pcs_3"),
    pcs4: integer("pcs_4"),
    pcs5: integer("pcs_5"),
    pcs6: integer("pcs_6"),
    pcs7: integer("pcs_7"),
    pcs8: integer("pcs_8"),
    pcs9: integer("pcs_9"),
    pcs10: integer("pcs_10"),
    pcs11: integer("pcs_11"),
    pcs12: integer("pcs_12"),
    pcs13: integer("pcs_13"),
    pcs14: integer("pcs_14"),
    pcs15: integer("pcs_15"),
    pcs16: integer("pcs_16"),
    pcs17: integer("pcs_17"),
    pcs18: integer("pcs_18"),
    pcs19: integer("pcs_19"),
    pcs20: integer("pcs_20"),
    pcs21: integer("pcs_21"),
    pcs22: integer("pcs_22"),
    pcs23: integer("pcs_23"),
    pcs24: integer("pcs_24"),
    pcr3: integer("pcr_3"),
    pcr5: integer("pcr_5"),
    pcr6: integer("pcr_6"),
    pcr8: integer("pcr_8"),
    pcr10: integer("pcr_10"),
    pcr12: integer("pcr_12"),
    pcr13: integer("pcr_13"),
    pcr16: integer("pcr_16"),
    pcr17: integer("pcr_17"),
    pcr19: integer("pcr_19"),
    pcr21: integer("pcr_21"),
    pcr23: integer("pcr_23"),
    personalityQ1: integer("personality_q1"),
    personalityQ2: integer("personality_q2"),
    personalityQ3: integer("personality_q3"),
    personalityQ4: integer("personality_q4"),
    personalityQ5: integer("personality_q5"),
    personalityRQ1: integer("personality_rq1"),
    personalityRQ4: integer("personality_rq4"),
    swemwbs1: integer("swemwbs_1"),
    swemwbs2: integer("swemwbs_2"),
    swemwbs3: integer("swemwbs_3"),
    swemwbs4: integer("swemwbs_4"),
    swemwbs5: integer("swemwbs_5"),
    swemwbs6: integer("swemwbs_6"),
    swemwbs7: integer("swemwbs_7"),
    pils1: integer("pils_1"),
    pils2: integer("pils_2"),
    pils3: integer("pils_3"),
    pils4: integer("pils_4"),
    pils5: integer("pils_5"),
    pils6: integer("pils_6"),
    pils7: integer("pils_7"),
    pils8: integer("pils_8"),
    pils9: integer("pils_9"),
    pils10: integer("pils_10"),
    pils11: integer("pils_11"),
    pils12: integer("pils_12"),
    epochE1: integer("epoch_e1"),
    epochE2: integer("epoch_e2"),
    epochE3: integer("epoch_e3"),
    epochE4: integer("epoch_e4"),
    epochP1: integer("epoch_p1"),
    epochP2: integer("epoch_p2"),
    epochP3: integer("epoch_p3"),
    epochP4: integer("epoch_p4"),
    epochO1: integer("epoch_o1"),
    epochO2: integer("epoch_o2"),
    epochO3: integer("epoch_o3"),
    epochO4: integer("epoch_o4"),
    epochC1: integer("epoch_c1"),
    epochC2: integer("epoch_c2"),
    epochC3: integer("epoch_c3"),
    epochC4: integer("epoch_c4"),
    epochH1: integer("epoch_h1"),
    epochH2: integer("epoch_h2"),
    epochH3: integer("epoch_h3"),
    epochH4: integer("epoch_h4"),
    ucla1: integer("ucla_1"),
    ucla2: integer("ucla_2"),
    ucla3: integer("ucla_3"),
    ucla4: integer("ucla_4"),
    ucla5: integer("ucla_5"),
    ucla6: integer("ucla_6"),
    ucla7: integer("ucla_7"),
    ucla8: integer("ucla_8"),
    pcsc1: integer("pcsc_1"),
    pcsc2: integer("pcsc_2"),
    pcsc3: integer("pcsc_3"),
    pcsc4: integer("pcsc_4"),
    pcsc5: integer("pcsc_5"),
    pcsc6: integer("pcsc_6"),
    pcsc7: integer("pcsc_7"),
    pcsc8: integer("pcsc_8"),
    scs1: integer("scs_1"),
    scs2: integer("scs_2"),
    scs3: integer("scs_3"),
    scs4: integer("scs_4"),
    scs5: integer("scs_5"),
    scs6: integer("scs_6"),
    sps1: integer("sps_1"),
    sps2: integer("sps_2"),
    sps3: integer("sps_3"),
    sps4: integer("sps_4"),
    sps5: integer("sps_5"),
    sps6: integer("sps_6"),
    sps7: integer("sps_7"),
    sps8: integer("sps_8"),
    sps9: integer("sps_9"),
    sps10: integer("sps_10"),
    sps11: integer("sps_11"),
    sps12: integer("sps_12"),
    iptq1: integer("iptq_1"),
    iptq2: integer("iptq_2"),
    iptq3: integer("iptq_3"),
    moc1: integer("moc_1"),
    moc2: integer("moc_2"),
    moc3: integer("moc_3"),
    moc4: integer("moc_4"),
    moc5: integer("moc_5"),
    moc6: integer("moc_6"),
    moc7: integer("moc_7"),
    moc8: integer("moc_8"),
    moc9: integer("moc_9"),
    moc10: integer("moc_10"),
    fb1Accept: integer("fb1_accept"),
    fb2Feas: integer("fb2_feas"),
  },
  (table) => [
    foreignKey({
      columns: [table.shamiriId],
      foreignColumns: [student.visibleId],
      name: "student_outcomes_shamiri_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.visibleId],
      name: "student_outcomes_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const studentReportingNotes = pgTable(
  "student_reporting_notes",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    supervisorId: varchar("supervisor_id", { length: 255 }),
    studentId: varchar("student_id", { length: 255 }).notNull(),
    notes: text().notNull(),
    addedBy: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "student_reporting_notes_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [student.id],
      name: "student_reporting_notes_student_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.addedBy],
      foreignColumns: [user.id],
      name: "student_reporting_notes_addedBy_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const fellowReportingNotes = pgTable(
  "fellow_reporting_notes",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    notes: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "fellow_reporting_notes_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "fellow_reporting_notes_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const overallFellowEvaluation = pgTable(
  "overall_fellow_evaluations",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    fellowBehaviourNotes: text("fellow_behaviour_notes").notNull(),
    programDeliveryNotes: text("program_delivery_notes").notNull(),
    dressingAndGroomingNotes: text("dressing_and_grooming_notes").notNull(),
    punctualityNotes: text("punctuality_notes").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "overall_fellow_evaluations_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "overall_fellow_evaluations_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const repaymentRequest = pgTable(
  "repayment_requests",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    hubId: varchar("hub_id", { length: 255 }).notNull(),
    fellowAttendanceId: integer("fellow_attendance_id").notNull(),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true, mode: "date" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "repayment_requests_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "repayment_requests_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.hubId],
      foreignColumns: [hub.id],
      name: "repayment_requests_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.fellowAttendanceId],
      foreignColumns: [fellowAttendance.id],
      name: "repayment_requests_fellow_attendance_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const implementerMember = pgTable(
  "implementer_members",
  {
    id: serial().primaryKey().notNull(),
    implementerId: varchar("implementer_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    identifier: varchar({ length: 255 }),
    role: implementerRoleEnum().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "implementer_members_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "implementer_members_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const clinicalExpertCaseNotes = pgTable(
  "clinical_expert_case_notes",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    name: varchar({ length: 255 }).notNull(),
    caseId: text().notNull(),
    comment: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [clinicalScreeningInfo.id],
      name: "clinical_expert_case_notes_caseId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const clinicalCaseTransferTrail = pgTable(
  "clinical_case_transfer_trail",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    date: timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    from: varchar({ length: 255 }).notNull(),
    fromRole: varchar("from_role", { length: 255 }).notNull(),
    to: varchar({ length: 255 }).notNull(),
    toRole: varchar("to_role", { length: 255 }).notNull(),
    caseId: text().notNull(),
    referralStatus: referralStatusOptionsEnum("referral_status"),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [clinicalScreeningInfo.id],
      name: "clinical_case_transfer_trail_caseId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const fellowComplaints = pgTable(
  "fellow_complaints",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    complaint: text().notNull(),
    supervisorId: varchar("supervisor_id", { length: 255 }),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    comments: text(),
    createdBy: text("created_by"),
  },
  (table) => [
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "fellow_complaints_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "fellow_complaints_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "fellow_complaints_created_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const delayedPaymentRequest = pgTable(
  "delayed_payment_requests",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
    interventionSessionId: varchar("intervention_session_id", { length: 255 }).notNull(),
    fellowAttendanceId: integer("fellow_attendance_id").notNull(),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true, mode: "date" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "delayed_payment_requests_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "delayed_payment_requests_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.interventionSessionId],
      foreignColumns: [interventionSession.id],
      name: "delayed_payment_requests_intervention_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.fellowAttendanceId],
      foreignColumns: [fellowAttendance.id],
      name: "delayed_payment_requests_fellow_attendance_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const clinicalSessionAttendance = pgTable(
  "clinical_session_attendance",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    date: timestamp({ withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    supervisorId: varchar("supervisor_id", { length: 255 }),
    session: varchar({ length: 255 }).notNull(),
    caseId: text().notNull(),
    attendanceStatus: boolean("attendance_status"),
    clinicalLeadId: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [clinicalScreeningInfo.id],
      name: "clinical_session_attendance_caseId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const project = pgTable(
  "projects",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    visibleId: varchar("visible_id", { length: 255 }).notNull(),
    name: varchar({ length: 100 }).notNull(),
    projectLead: varchar("project_lead", { length: 255 }),
    funder: varchar({ length: 255 }),
    budget: integer(),
    phase: integer(),
    estimatedStartDate: date("estimated_start_date", { mode: "date" }),
    estimatedEndDate: date("estimated_end_date", { mode: "date" }),
    actualStartDate: date("actual_start_date", { mode: "date" }),
    actualEndDate: date("actual_end_date", { mode: "date" }),
    isDefault: boolean("is_default").default(false).notNull(),
  },
  (table) => [uniqueIndex("projects_visible_id_key").using("btree", table.visibleId)],
);

export const weeklyFellowRatings = pgTable(
  "weekly_fellow_ratings",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    behaviourNotes: text("behaviour_notes").notNull(),
    programDeliveryNotes: text("program_delivery_notes").notNull(),
    dressingAndGroomingNotes: text("dressing_and_grooming_notes").notNull(),
    punctualityNotes: text("punctuality_notes").notNull(),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    supervisorId: text("supervisor_id").notNull(),
    week: date("week", { mode: "date" }).notNull(),
    behaviourRating: integer("behaviour_rating"),
    dressingAndGroomingRating: integer("dressing_and_grooming_rating"),
    programDeliveryRating: integer("program_delivery_rating"),
    punctualityRating: integer("punctuality_rating"),
  },
  (table) => [
    uniqueIndex("weekly_fellow_ratings_fellow_id_supervisor_id_week_key").using(
      "btree",
      table.fellowId,
      table.supervisorId,
      table.week,
    ),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "weekly_fellow_ratings_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "weekly_fellow_ratings_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const clinicalScreeningInfo = pgTable(
  "clinical_screening_info",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    studentId: varchar("student_id", { length: 255 }).notNull(),
    caseStatus: caseStatusOptionsEnum("case_status").notNull(),
    riskStatus: riskStatusOptionsEnum("risk_status").notNull(),
    schoolId: varchar("school_id", { length: 255 }).notNull(),
    currentSupervisorId: varchar("current_supervisor_id", { length: 255 }),
    referredToSupervisorId: varchar("referredTo_supervisor_id", { length: 255 }),
    acceptCase: boolean("accept_case").default(false).notNull(),
    generalPresentingIssues: varchar("general_presenting_issues", { length: 255 }),
    generalPresentingIssuesOtherSpecified: text("general_presenting_issues_other_specified"),
    emergencyPresentingIssues: json("emergency_presenting_issues").$type<JsonValue>(),
    referredFrom: varchar("referred_from", { length: 255 }),
    referredFromSpecified: varchar("referred_from_specified", { length: 255 }),
    referredTo: varchar("referred_to", { length: 255 }),
    referredToSpecified: varchar("referred_to_specified", { length: 255 }),
    referralNotes: text("referral_notes"),
    progressNotes: varchar("progress_notes", { length: 255 }),
    treatmentPlan: varchar("treatment_plan", { length: 255 }),
    caseReport: varchar("case_report", { length: 255 }),
    flagged: boolean().default(false).notNull(),
    initialCaseHistoryId: varchar("initial_case_history_id", { length: 255 }),
    initialCaseHistoryOwnerId: varchar("initial_case_history_owner_id", { length: 255 }),
    referralStatus: referralStatusOptionsEnum("referral_status"),
    academicStruggles: boolean("academic_struggles"),
    anxiety: boolean(),
    blendedFamilyDynamics: boolean("blended_family_dynamics"),
    flaggedReason: text("flagged_reason"),
    homeEnvironment: boolean("home_environment"),
    medicalCondition: boolean("medical_condition"),
    parentChildRelationships: boolean("parent_child_relationships"),
    peerRelationships: boolean("peer_relationships"),
    selfPerception: boolean("self_perception"),
    selfRegulation: boolean("self_regulation"),
    sexuality: boolean(),
    studentTeacherRelationships: boolean("student_teacher_relationships"),
    unresolvedGriefLoss: boolean("unresolved_grief_loss"),
    initialReferredFrom: varchar("initial_referred_from", { length: 255 }),
    initialReferredFromSpecified: varchar("initial_referred_from_specified", { length: 255 }),
    nonSuicidalSelfInjury: boolean("non_suicidal_self_injury"),
    referralReason: text("referral_reason"),
    pseudonym: varchar({ length: 255 }),
    sessionWhenCaseIsFlaggedId: varchar("session_when_case_is_flagged_id", { length: 255 }),
    emergencyPresentingIssuesBaseline: json(
      "emergency_presenting_issues_baseline",
    ).$type<JsonValue>(),
    emergencyPresentingIssuesEndpoint: json(
      "emergency_presenting_issues_endpoint",
    ).$type<JsonValue>(),
    generalPresentingIssuesBaseline: json("general_presenting_issues_baseline").$type<JsonValue>(),
    generalPresentingIssuesEndpoint: json("general_presenting_issues_endpoint").$type<JsonValue>(),
    generalPresentingIssuesOtherSpecifiedBaseline: text(
      "general_presenting_issues_other_specified_baseline",
    ),
    generalPresentingIssuesOtherSpecifiedEndpoint: text(
      "general_presenting_issues_other_specified_endpoint",
    ),
    clinicalLeadId: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [student.id],
      name: "clinical_screening_info_student_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.referredToSupervisorId],
      foreignColumns: [supervisor.id],
      name: "clinical_screening_info_referredTo_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.sessionWhenCaseIsFlaggedId],
      foreignColumns: [interventionSession.id],
      name: "clinical_screening_info_session_when_case_is_flagged_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.clinicalLeadId],
      foreignColumns: [clinicalLead.id],
      name: "clinical_screening_info_clinicalLeadId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.currentSupervisorId],
      foreignColumns: [supervisor.id],
      name: "clinical_screening_info_current_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const interventionGroup = pgTable(
  "intervention_groups",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    groupName: varchar("group_name", { length: 100 }).notNull(),
    leaderId: varchar("leader_id", { length: 255 }).notNull(),
    schoolId: text("school_id").notNull(),
    projectId: varchar("project_id", { length: 100 }).notNull(),
    groupType: groupTypeEnum("group_type").default("TREATMENT").notNull(),
  },
  (table) => [
    uniqueIndex("intervention_groups_leader_id_school_id_key").using(
      "btree",
      table.leaderId,
      table.schoolId,
    ),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "intervention_groups_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.leaderId],
      foreignColumns: [fellow.id],
      name: "intervention_groups_leader_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [school.id],
      name: "intervention_groups_school_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const weeklyTeamMeetingReport = pgTable(
  "weekly_team_meeting_reports",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    logisticsRelatedIssues: text("logistics_related_issues").notNull(),
    logisticsRelatedIssuesRating: integer("logistics_related_issues_rating").notNull(),
    relationshipManagement: text("relationship_management").notNull(),
    relationshipManagementRating: integer("relationship_management_rating").notNull(),
    digitalHubIssues: text("digital_hub_issues").notNull(),
    digitalHubIssuesRating: integer("digital_hub_issues_rating").notNull(),
    anyOtherChallenges: text("any_other_challenges").notNull(),
    anyOtherChallengesRating: integer("any_other_challenges_rating").notNull(),
    recommendations: text().notNull(),
    week: date("week", { mode: "date" }).notNull(),
    submittedBy: varchar("submitted_by", { length: 255 }).notNull(),
    hubId: varchar("hub_id", { length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.submittedBy],
      foreignColumns: [hubCoordinator.id],
      name: "weekly_team_meeting_reports_submitted_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.hubId],
      foreignColumns: [hub.id],
      name: "weekly_team_meeting_reports_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const payoutReconciliation = pgTable(
  "payout_reconciliations",
  {
    id: serial().primaryKey().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    executedAt: timestamp("executed_at", { withTimezone: true, mode: "date" }),
    amount: integer().notNull(),
    currency: varchar({ length: 3 }).default("KES").notNull(),
    description: text(),
    fellowId: text("fellow_id").notNull(),
    relatedDetails: jsonb("related_details").$type<JsonValue>(),
  },
  (table) => [
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "payout_reconciliations_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const interventionGroupReport = pgTable(
  "intervention_group_reports",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    groupId: varchar("group_id", { length: 255 }).notNull(),
    engagement1: integer("engagement_1"),
    engagement2: integer("engagement_2"),
    engagement3: integer("engagement_3"),
    engagementComment: text("engagement_comment"),
    cooperation1: integer("cooperation_1"),
    cooperation2: integer("cooperation_2"),
    cooperation3: integer("cooperation_3"),
    cooperationComment: text("cooperation_comment"),
    content: integer(),
    contentComment: text("content_comment"),
    sessionId: text("intervention_session_id"),
    isAllReport: boolean("is_all_report"),
  },
  (table) => [
    uniqueIndex("intervention_group_reports_intervention_session_id_group_id_key").using(
      "btree",
      table.sessionId,
      table.groupId,
    ),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [interventionGroup.id],
      name: "intervention_group_reports_group_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [interventionSession.id],
      name: "intervention_group_reports_intervention_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const studentGroupTransferTrail = pgTable(
  "student_group_transfer_trail",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    studentId: text("student_id").notNull(),
    currentGroupId: text("current_group_id").notNull(),
    fromGroupId: text("from_group_id"),
  },
  (table) => [
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [student.id],
      name: "student_group_transfer_trail_student_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.fromGroupId],
      foreignColumns: [interventionGroup.id],
      name: "student_group_transfer_trail_from_group_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const weeklyHubReport = pgTable(
  "weekly_hub_reports",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    recommendations: text().notNull(),
    week: date("week", { mode: "date" }).notNull(),
    submittedBy: varchar("submitted_by", { length: 255 }).notNull(),
    hubId: varchar("hub_id", { length: 255 }).notNull(),
    challenges: text().notNull(),
    fellowRelatedIssuesAndObservations: text("fellow_related_issues_and_observations").notNull(),
    fellowRelatedIssuesAndObservationsRating: integer(
      "fellow_related_issues_and_observations_rating",
    ).notNull(),
    hubRelatedIssuesAndObservations: text("hub_related_issues_and_observations").notNull(),
    hubRelatedIssuesAndObservationsRating: integer(
      "hub_related_issues_and_observations_rating",
    ).notNull(),
    schoolRelatedIssuesAndObservations: text("school_related_issues_and_observations").notNull(),
    schoolRelatedIssuesAndObservationRating: integer(
      "school_related_issues_and_observations_rating",
    ).notNull(),
    successes: text().notNull(),
    supervisorRelatedIssuesAndObservations: text(
      "supervisor_related_issues_and_observations",
    ).notNull(),
    supervisorRelatedIssuesAndObservationsRating: integer(
      "supervisor_related_issues_and_observations_rating",
    ).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.submittedBy],
      foreignColumns: [hubCoordinator.id],
      name: "weekly_hub_reports_submitted_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.hubId],
      foreignColumns: [hub.id],
      name: "weekly_hub_reports_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const schoolDropoutHistory = pgTable(
  "school_dropout_history",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    droppedOut: boolean("dropped_out").notNull(),
    dropoutReason: text("dropout_reason"),
    userId: text("user_id").notNull(),
    schoolId: text("school_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "school_dropout_history_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [school.id],
      name: "school_dropout_history_school_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const supervisorAttendance = pgTable(
  "supervisor_attendances",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    projectId: text("project_id").notNull(),
    schoolId: varchar("school_id", { length: 255 }),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
    attended: boolean(),
    absenceReason: text("absence_reason"),
    absenceComments: text("absence_comments"),
    sessionId: text("session_id").notNull(),
    markedBy: text("marked_by").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "supervisor_attendances_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "supervisor_attendances_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [interventionSession.id],
      name: "supervisor_attendances_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.markedBy],
      foreignColumns: [user.id],
      name: "supervisor_attendances_marked_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [school.id],
      name: "supervisor_attendances_school_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const supervisorComplaints = pgTable(
  "supervisor_complaints",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    projectId: text("project_id").notNull(),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
    complaint: text("absence_reason").notNull(),
    comments: text("absence_comments"),
    hubCoordinatorId: varchar("hub_coordinator_id", { length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "supervisor_complaints_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "supervisor_complaints_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.hubCoordinatorId],
      foreignColumns: [hubCoordinator.id],
      name: "supervisor_complaints_hub_coordinator_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const monthlySupervisorEvaluation = pgTable(
  "monthly_supervisor_evaluation",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    projectId: text("project_id").notNull(),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
    hubCoordinatorId: varchar("hub_coordinator_id", { length: 255 }).notNull(),
    month: date("month", { mode: "date" }).notNull(),
    respectfulness: integer().notNull(),
    attitude: integer().notNull(),
    collaboration: integer().notNull(),
    reliability: integer().notNull(),
    identificationOfIssues: integer("identification_of_issues").notNull(),
    leadership: integer().notNull(),
    communicationStyle: integer("communication_style").notNull(),
    conflictResolution: integer("conflict_resolution").notNull(),
    adaptability: integer().notNull(),
    recognitionAndFeedback: integer("recognition_and_feedback").notNull(),
    decisionMaking: integer("decision_making").notNull(),
    fellowRecruitmentEffectiveness: integer("fellow_recruitment_effectiveness").notNull(),
    fellowTrainingEffectiveness: integer("fellow_training_effectiveness").notNull(),
    programLogisticsCoordination: integer("program_logistics_coordination").notNull(),
    programSessionAttendance: integer("program_session_attendace").notNull(),
    managementStyleComments: text("management_style_comments"),
    workplaceDemeanorComments: text("workplace_demeanor_comments"),
    programExecutionComments: text("program_execution_comments"),
  },
  (table) => [
    uniqueIndex("monthly_supervisor_evaluation_project_id_month_supervisor_i_key").using(
      "btree",
      table.projectId,
      table.month,
      table.supervisorId,
    ),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "monthly_supervisor_evaluation_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "monthly_supervisor_evaluation_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.hubCoordinatorId],
      foreignColumns: [hubCoordinator.id],
      name: "monthly_supervisor_evaluation_hub_coordinator_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const sessionName = pgTable(
  "session_names",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    sessionType: sessionTypesEnum().notNull(),
    sessionName: varchar("session_name", { length: 255 }).notNull(),
    amount: integer(),
    currency: varchar({ length: 100 }).default("KES").notNull(),
    hubId: varchar("hub_id", { length: 255 }).notNull(),
    sessionLabel: varchar("session_label", { length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.hubId],
      foreignColumns: [hub.id],
      name: "session_names_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const specialApprovalRequests = pgTable(
  "special_session_approval_requests",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: "date" }),
    amount: integer().notNull(),
    createdBy: text("created_by").notNull(),
    fellowAttendanceId: integer("fellow_attendance_id").notNull(),
    status: approvalStatusEnum().default("PENDING").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.approvedBy],
      foreignColumns: [hubCoordinator.id],
      name: "special_session_approval_requests_approved_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [supervisor.id],
      name: "special_session_approval_requests_created_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.fellowAttendanceId],
      foreignColumns: [fellowAttendance.id],
      name: "special_session_approval_requests_fellow_attendance_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const studentAttendance = pgTable(
  "student_attendances",
  {
    id: serial().primaryKey().notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    projectId: text("project_id").notNull(),
    studentId: varchar("student_id", { length: 255 }).notNull(),
    schoolId: varchar("school_id", { length: 255 }),
    fellowId: varchar("fellow_id", { length: 255 }),
    attended: boolean(),
    absenceReason: text("absence_reason"),
    sessionId: text("session_id").notNull(),
    groupId: varchar("group_id", { length: 255 }),
    comments: text(),
    markedBy: text("marked_by"),
  },
  (table) => [
    index("student_attendances_session_id_idx").using("btree", table.sessionId),
    uniqueIndex("student_attendances_student_id_session_id_key").using(
      "btree",
      table.studentId,
      table.sessionId,
    ),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "student_attendances_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [student.id],
      name: "student_attendances_student_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [interventionSession.id],
      name: "student_attendances_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [interventionGroup.id],
      name: "student_attendances_group_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [school.id],
      name: "student_attendances_school_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "student_attendances_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.markedBy],
      foreignColumns: [user.id],
      name: "student_attendances_marked_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const fellowPaymentComplaints = pgTable(
  "fellow_payment_complaints",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    dateOfComplaint: timestamp("date_of_complaint", { withTimezone: true, mode: "date" }),
    reason: varchar({ length: 255 }).notNull(),
    statement: varchar({ length: 255 }).notNull(),
    confirmedAmountReceived: integer("confirmed_amount_received"),
    differenceInAmount: integer("difference_in_amount"),
    status: approvalStatusEnum().default("PENDING").notNull(),
    comments: text(),
    reasonForRejection: text("reason_for_rejection"),
    reasonForAcceptance: text("reason_for_acceptance"),
    fellowAttendanceId: integer("fellow_attendance_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.fellowAttendanceId],
      foreignColumns: [fellowAttendance.id],
      name: "fellow_payment_complaints_fellow_attendance_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const sessionComment = pgTable(
  "session_comments",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    content: text().notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [interventionSession.id],
      name: "session_comments_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "session_comments_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const payoutStatements = pgTable(
  "payout_statements",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    fellowAttendanceId: integer("fellow_attendance_id").notNull(),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    amount: integer().notNull(),
    reason: text().notNull(),
    notes: text(),
    createdBy: text("created_by").notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true, mode: "date" }),
    mpesaNumber: text("mpesa_number"),
    specialPayoutRequestId: text("special_payout_request_id"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "date" }),
    confirmedBy: text("confirmed_by"),
  },
  (table) => [
    foreignKey({
      columns: [table.fellowAttendanceId],
      foreignColumns: [fellowAttendance.id],
      name: "payout_statements_fellow_attendance_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "payout_statements_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.specialPayoutRequestId],
      foreignColumns: [specialApprovalRequests.id],
      name: "payout_statements_special_payout_request_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "payout_statements_created_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.confirmedBy],
      foreignColumns: [user.id],
      name: "payout_statements_confirmed_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const schoolFeedback = pgTable(
  "school_feedbacks",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    studentTeacherSatisfactionRating: integer("student_teacher_satisfaction_rating"),
    factorsInfluencedStudentParticipation: text("factors_influenced_student_participation"),
    concernsRaisedByTeachers: text("concerns_raised_by_teachers"),
    programImpactOnStudents: text("program_impact_on_students"),
    schoolId: varchar({ length: 255 }),
    userId: varchar("user_id", { length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [school.id],
      name: "school_feedbacks_schoolId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "school_feedbacks_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const clinicalFollowUpTreatmentPlan = pgTable(
  "clinical_follow_up_treatment_plan",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    currentORSScore: integer("current_ors_score"),
    plannedSessions: integer("planned_sessions").notNull(),
    sessionFrequency: text("session_frequency").notNull(),
    plannedTreatmentIntervention: text("planned_treatment_intervention").array(),
    otherTreatmentIntervention: text("other_treatment_intervention"),
    plannedTreatmentInterventionExplanation: text(
      "planned_treatment_intervention_explanation",
    ).notNull(),
    caseId: text("case_id").notNull(),
  },
  (table) => [
    uniqueIndex("clinical_follow_up_treatment_plan_case_id_key").using("btree", table.caseId),
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [clinicalScreeningInfo.id],
      name: "clinical_follow_up_treatment_plan_case_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const clinicalFollowUpTreatmentPlanAuditTrail = pgTable(
  "clinical_follow_up_treatment_plan_audit_trail",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    action: text().notNull(),
    userId: text("user_id").notNull(),
    beforeData: jsonb("before_data").$type<JsonValue>(),
    afterData: jsonb("after_data").$type<JsonValue>(),
    caseId: text("case_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "clinical_follow_up_treatment_plan_audit_trail_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [clinicalScreeningInfo.id],
      name: "clinical_follow_up_treatment_plan_audit_trail_case_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const adminUser = pgTable(
  "admin_users",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    email: varchar({ length: 255 }).notNull(),
    adminName: varchar("name", { length: 255 }).notNull(),
  },
  (table) => [uniqueIndex("admin_users_email_key").using("btree", table.email)],
);

export const opsUser = pgTable(
  "ops_users",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    email: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    gender: varchar({ length: 10 }),
    cellPhone: varchar("cell_phone", { length: 255 }),
    droppedOut: boolean("dropped_out"),
    implementerId: varchar("implementer_id", { length: 255 }).notNull(),
    assignedHubId: varchar("assigned_hub_id", { length: 255 }),
  },
  (table) => [
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "ops_users_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.assignedHubId],
      foreignColumns: [hub.id],
      name: "ops_users_assigned_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const clinicalCaseNotes = pgTable(
  "clinical_case_notes",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    presentingIssues: text("presenting_issues").notNull(),
    orsAssessment: integer("ors_assessment").notNull(),
    riskLevel: text("risk_level").notNull(),
    necessaryConditions: text("necessary_conditions").notNull(),
    treatmentInterventions: text("treatment_interventions").array(),
    otherIntervention: text("other_intervention").notNull(),
    interventionExplanation: text("intervention_explanation").notNull(),
    studentResponseExplanations: text("student_response_explanations").notNull(),
    followUpPlan: followUpPlanOptionsEnum("follow_up_plan").notNull(),
    followUpPlanExplanation: text("follow_up_plan_explanation").notNull(),
    caseId: text("case_id").notNull(),
    sessionId: text("session_id").notNull(),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    uniqueIndex("clinical_case_notes_case_id_session_id_key").using(
      "btree",
      table.caseId,
      table.sessionId,
    ),
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [clinicalScreeningInfo.id],
      name: "clinical_case_notes_case_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [clinicalSessionAttendance.id],
      name: "clinical_case_notes_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "clinical_case_notes_created_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const clinicalCaseTermination = pgTable(
  "clinical_case_termination",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    terminationDate: timestamp("termination_date", { withTimezone: true, mode: "date" }).notNull(),
    terminationReason: text("termination_reason").notNull(),
    terminationReasonExplanation: text("termination_reason_explanation").notNull(),
    caseId: text("case_id").notNull(),
    sessionId: text("session_id").notNull(),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [clinicalScreeningInfo.id],
      name: "clinical_case_termination_case_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [clinicalSessionAttendance.id],
      name: "clinical_case_termination_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "clinical_case_termination_created_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const clinicalLead = pgTable(
  "clinical_leads",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    clinicalLeadName: varchar("clinical_lead_name", { length: 255 }).notNull(),
    clinicalLeadEmail: varchar("clinical_lead_email", { length: 255 }).notNull(),
    county: varchar({ length: 255 }),
    subCounty: varchar("sub_county", { length: 255 }),
    bankName: varchar("bank_name", { length: 255 }),
    bankBranch: varchar("bank_branch", { length: 255 }),
    bankAccountName: varchar("bank_account_name", { length: 255 }),
    bankAccountNumber: varchar("bank_account_number", { length: 255 }),
    kra: varchar({ length: 255 }),
    nhif: varchar({ length: 255 }),
    nssf: varchar({ length: 255 }),
    dateOfBirth: date("date_of_birth", { mode: "date" }),
    gender: varchar({ length: 10 }),
    trainingLevel: varchar("training_level", { length: 255 }),
    droppedOut: boolean("dropped_out"),
    assignedHubId: varchar("assigned_hub_id", { length: 255 }).notNull(),
    implementerId: varchar("implementer_id", { length: 255 }).notNull(),
    cellNumber: varchar("cell_number", { length: 255 }),
  },
  (table) => [
    foreignKey({
      columns: [table.assignedHubId],
      foreignColumns: [hub.id],
      name: "clinical_leads_assigned_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "clinical_leads_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const clinicalTeam = pgTable(
  "clinical_teams",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    cellNumber: varchar("cell_number", { length: 255 }),
    assignedHubId: varchar("assigned_hub_id", { length: 255 }),
    implementerId: varchar("implementer_id", { length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.assignedHubId],
      foreignColumns: [hub.id],
      name: "clinical_teams_assigned_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "clinical_teams_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    visibleId: serial("visible_id").notNull(),
    createdById: varchar("created_by", { length: 255 }).notNull(),
    subject: varchar({ length: 100 }).notNull(),
    description: text().notNull(),
    priority: ticketPriorityLevelEnum().default("MEDIUM").notNull(),
    category: ticketCategoryEnum().notNull(),
    status: ticketStatusEnum().default("OPEN").notNull(),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("tickets_visible_id_key").using("btree", table.visibleId),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [user.id],
      name: "tickets_created_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const ticketEscalations = pgTable(
  "ticket_escalations",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    ticketId: varchar("ticket_id", { length: 255 }).notNull(),
    escalatedById: varchar("escalated_by", { length: 255 }).notNull(),
    escalatedToId: varchar("escalated_to", { length: 255 }).notNull(),
    escalationReason: text("escalation_reason").notNull(),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: "ticket_escalations_ticket_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.escalatedById],
      foreignColumns: [user.id],
      name: "ticket_escalations_escalated_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.escalatedToId],
      foreignColumns: [user.id],
      name: "ticket_escalations_escalated_to_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const triageEventAudit = pgTable(
  "triage_event_audits",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    triageEventId: varchar("triage_event_id", { length: 255 }).notNull(),
    editedById: varchar("edited_by_id", { length: 255 }).notNull(),
    beforeData: jsonb("before_data").$type<JsonValue>(),
    afterData: jsonb("after_data").$type<JsonValue>(),
  },
  (table) => [
    foreignKey({
      columns: [table.triageEventId],
      foreignColumns: [triageEvent.id],
      name: "triage_event_audits_triage_event_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.editedById],
      foreignColumns: [user.id],
      name: "triage_event_audits_edited_by_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const triageEvent = pgTable(
  "triage_events",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    studentAttendanceId: integer("student_attendance_id"),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    studentId: varchar("student_id", { length: 255 }).notNull(),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    hubId: varchar("hub_id", { length: 255 }),
    triageOccurred: boolean("triage_occurred").notNull(),
    riskScreenOutcome: riskScreenOutcomeEnum("risk_screen_outcome"),
    riskNotCompletedReason: riskNotCompletedReasonEnum("risk_not_completed_reason"),
    actionTaken: triageActionTakenEnum("action_taken"),
    referredSupervisorId: varchar("referred_supervisor_id", { length: 255 }),
    supervisorHandoffStatus: supervisorHandoffStatusEnum("supervisor_handoff_status"),
    note: varchar({ length: 500 }),
    metadata: jsonb().$type<JsonValue>(),
    reviewNote: varchar("review_note", { length: 300 }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    reviewedById: varchar("reviewed_by_id", { length: 255 }),
  },
  (table) => [
    uniqueIndex("triage_events_student_attendance_id_key").using(
      "btree",
      table.studentAttendanceId,
    ),
    uniqueIndex("triage_events_student_id_session_id_key").using(
      "btree",
      table.studentId,
      table.sessionId,
    ),
    foreignKey({
      columns: [table.studentAttendanceId],
      foreignColumns: [studentAttendance.id],
      name: "triage_events_student_attendance_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [interventionSession.id],
      name: "triage_events_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [student.id],
      name: "triage_events_student_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "triage_events_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.hubId],
      foreignColumns: [hub.id],
      name: "triage_events_hub_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.referredSupervisorId],
      foreignColumns: [supervisor.id],
      name: "triage_events_referred_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.reviewedById],
      foreignColumns: [user.id],
      name: "triage_events_reviewed_by_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ],
);

export const sessionRecording = pgTable(
  "session_recordings",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
    s3Key: varchar("s3_key", { length: 500 }).notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    fileSize: integer("file_size").notNull(),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    schoolId: varchar("school_id", { length: 255 }).notNull(),
    groupId: varchar("group_id", { length: 255 }).notNull(),
    sessionId: varchar("intervention_session_id", { length: 255 }).notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    supervisorId: varchar("supervisor_id", { length: 255 }).notNull(),
    status: recordingProcessingStatusEnum().default("PENDING").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0).notNull(),
    fidelityFeedback: jsonb("fidelity_feedback").$type<JsonValue>(),
    overallScore: varchar("overall_score", { length: 50 }),
    fidelityJobId: varchar("fidelity_job_id", { length: 255 }),
    fidelityJobSubmittedAt: timestamp("fidelity_job_submitted_at", {
      withTimezone: true,
      mode: "date",
    }),
    transcript: jsonb().$type<JsonValue>(),
    promptVersion: integer("prompt_version"),
  },
  (table) => [
    uniqueIndex("session_recordings_fellow_id_school_id_group_id_interventio_key").using(
      "btree",
      table.fellowId,
      table.schoolId,
      table.groupId,
      table.sessionId,
    ),
    index("session_recordings_status_idx").using("btree", table.status),
    index("session_recordings_supervisor_id_idx").using("btree", table.supervisorId),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "session_recordings_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.schoolId],
      foreignColumns: [school.id],
      name: "session_recordings_school_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [interventionGroup.id],
      name: "session_recordings_group_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [interventionSession.id],
      name: "session_recordings_intervention_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.uploadedBy],
      foreignColumns: [user.id],
      name: "session_recordings_uploaded_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisor.id],
      name: "session_recordings_supervisor_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const attendanceDocuments = pgTable(
  "attendance_documents",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    groupId: varchar("group_id", { length: 255 }).notNull(),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(),
    link: varchar({ length: 255 }).notNull(),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [interventionGroup.id],
      name: "attendance_documents_group_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [interventionSession.id],
      name: "attendance_documents_session_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.uploadedBy],
      foreignColumns: [user.id],
      name: "attendance_documents_uploaded_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const ticketResolutions = pgTable(
  "ticket_resolutions",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    ticketId: varchar("ticket_id", { length: 255 }).notNull(),
    resolvedById: varchar("resolved_by", { length: 255 }).notNull(),
    resolutionReason: text("resolution_reason").notNull(),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: "ticket_resolutions_ticket_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.resolvedById],
      foreignColumns: [user.id],
      name: "ticket_resolutions_resolved_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    unique("ticket_resolutions_ticket_id_key").on(table.ticketId),
  ],
);

export const fellowGroupReport = pgTable(
  "fellow_group_reports",
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "date" }).notNull(),
    fellowId: varchar("fellow_id", { length: 255 }).notNull(),
    groupId: varchar("group_id", { length: 255 }).notNull(),
    projectId: varchar("project_id", { length: 100 }).notNull(),
    structuralFidelity: integer("structural_fidelity").notNull(),
    processFidelity: integer("process_fidelity").notNull(),
    adaptationsMade: boolean("adaptations_made").notNull(),
    adaptationType: adaptationTypeEnum("adaptation_type"),
    adaptationReason: varchar("adaptation_reason", { length: 500 }),
    behavioralEngagement: integer("behavioral_engagement").notNull(),
    reflectiveEngagement: integer("reflective_engagement").notNull(),
    psychologicalSafety: integer("psychological_safety").notNull(),
    groupCohesion: integer("group_cohesion").notNull(),
    climateConcerns: boolean("climate_concerns").notNull(),
    climateConcernsDetail: varchar("climate_concerns_detail", { length: 500 }),
    skillComprehension: integer("skill_comprehension").notNull(),
    inSessionTransfer: integer("in_session_transfer").notNull(),
    homePracticeApplicable: boolean("home_practice_applicable").notNull(),
    homePracticeEngagement: integer("home_practice_engagement"),
    fellowGroupRelationship: integer("fellow_group_relationship").notNull(),
    externalDisruptions: boolean("external_disruptions").notNull(),
    externalDisruptionsDetail: varchar("external_disruptions_detail", { length: 500 }),
    facilitatorConfidence: integer("facilitator_confidence").notNull(),
    hardestAspect: varchar("hardest_aspect", { length: 500 }).notNull(),
    challengeImpact: integer("challenge_impact").notNull(),
    whatWentWell: varchar("what_went_well", { length: 500 }).notNull(),
    supportType: supportTypeEnum("support_type").notNull(),
    supportDetail: varchar("support_detail", { length: 500 }),
  },
  (table) => [
    uniqueIndex("fellow_group_reports_fellow_id_group_id_key").using(
      "btree",
      table.fellowId,
      table.groupId,
    ),
    index("fellow_group_reports_group_id_idx").using("btree", table.groupId),
    index("fellow_group_reports_project_id_idx").using("btree", table.projectId),
    foreignKey({
      columns: [table.fellowId],
      foreignColumns: [fellow.id],
      name: "fellow_group_reports_fellow_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [interventionGroup.id],
      name: "fellow_group_reports_group_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "fellow_group_reports_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const ticketReassignments = pgTable(
  "ticket_reassignments",
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => randomUUID()),
    ticketId: varchar("ticket_id", { length: 255 }).notNull(),
    escalationId: varchar("escalation_id", { length: 255 }).notNull(),
    reassignedFrom: varchar("reassigned_from", { length: 255 }).notNull(),
    reassignedTo: varchar("reassigned_to", { length: 255 }).notNull(),
    reassignmentReason: text("reassignment_reason").notNull(),
    archivedAt: timestamp("archived_at", { precision: 3, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("ticket_reassignments_escalation_id_key").using("btree", table.escalationId),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: "ticket_reassignments_ticket_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.escalationId],
      foreignColumns: [ticketEscalations.id],
      name: "ticket_reassignments_escalation_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.reassignedFrom],
      foreignColumns: [user.id],
      name: "ticket_reassignments_reassigned_from_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.reassignedTo],
      foreignColumns: [user.id],
      name: "ticket_reassignments_reassigned_to_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const projectImplementer = pgTable(
  "project_implementers",
  {
    implementerId: varchar("implementer_id", { length: 255 }).notNull(),
    projectId: varchar("project_id", { length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "project_implementers_project_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.implementerId],
      foreignColumns: [implementer.id],
      name: "project_implementers_implementer_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    primaryKey({
      columns: [table.projectId, table.implementerId],
      name: "project_implementers_pkey",
    }),
  ],
);
