import { faker } from "@faker-js/faker";
import { eq, sql } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  AdminTeam,
  caseStatusOptions,
  FollowUpPlanOptions,
  ImplementerRole,
  RecordingProcessingStatus,
  RiskScreenOutcome,
  referralStatusOptions,
  riskStatusOptions,
  sessionTypes,
  SurveyStatus,
  SurveyVersionStatus,
  TriageActionTaken,
} from "#/db/enums";
import {
  addDays,
  addHours,
  addWeeks,
  isBefore,
  startOfDay,
  startOfMonth,
  subWeeks,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { TypeID } from "typeid-js";
import { KENYAN_COUNTIES, SCHOOL_TYPES } from "#/lib/app-constants/constants";
import { db, pool } from "#/db/client";
import * as schema from "#/db/schema";
import {
  arsenalClinicalLead,
  arsenalClinicalTeamMember,
  arsenalCoordinators,
  arsenalFellows,
  arsenalHub,
  arsenalOpsUser,
  arsenalSupervisors,
  careAdminEmail,
  emiratesAcademy,
  plainAdminEmail,
  researchAdminEmail,
  sobhaAcademy,
  superAdminEmail,
} from "#/db/seed/fixtures";
import type { SurveyForm } from "#/lib/survey/form";
import { seedHubSessionTypes } from "#/db/seed/hub-session-types";
import { createTickets } from "#/db/seed/tickets";
import {
  buildRecordingsS3Key,
  generateRecordingFilename,
} from "#/lib/s3/key-builders/build-recordings-s3-key";

type AdminUser = InferSelectModel<typeof schema.adminUser>;
type ClinicalLead = InferSelectModel<typeof schema.clinicalLead>;
type ClinicalTeam = InferSelectModel<typeof schema.clinicalTeam>;
type Fellow = InferSelectModel<typeof schema.fellow>;
type Hub = InferSelectModel<typeof schema.hub>;
type HubCoordinator = InferSelectModel<typeof schema.hubCoordinator>;
type Implementer = InferSelectModel<typeof schema.implementer>;
type OpsUser = InferSelectModel<typeof schema.opsUser>;
type Project = InferSelectModel<typeof schema.project>;
type SessionName = InferSelectModel<typeof schema.sessionName>;
type Supervisor = InferSelectModel<typeof schema.supervisor>;

faker.seed(7634912);

// Dates count from the start of today in Nairobi, not from the current hour or month, so the seed
// has the same past and future sessions whenever it runs.
const SEED_TIME_ZONE = "Africa/Nairobi";
const seedToday = fromZonedTime(
  startOfDay(toZonedTime(new Date(), SEED_TIME_ZONE)),
  SEED_TIME_ZONE,
);
faker.setDefaultRefDate(seedToday);
const SESSION_WEEKS_BEFORE_TODAY = 4;

// The same ids on every run, in creation order, so fixtures that order by id pick the same rows.
let seedIdCount = 0;
function objectId(prefix: string) {
  seedIdCount += 1;
  const time = seedToday.getTime().toString(16).padStart(12, "0");
  const count = seedIdCount.toString(16).padStart(12, "0");
  return TypeID.fromUUID(
    prefix,
    `${time.slice(0, 8)}-${time.slice(8)}-7000-8000-${count}`,
  ).toString();
}

const INSERT_CHUNK = 1000;

function* chunk<T>(rows: T[]) {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    yield rows.slice(i, i + INSERT_CHUNK);
  }
}

async function insertMany<T extends PgTable>(table: T, rows: InferInsertModel<T>[]) {
  for (const part of chunk(rows)) {
    await db.insert(table).values(part);
  }
}

async function insertManyReturning<T extends PgTable>(table: T, rows: InferInsertModel<T>[]) {
  const inserted: InferSelectModel<T>[] = [];
  for (const part of chunk(rows)) {
    const returned = (await db.insert(table).values(part).returning()) as InferSelectModel<T>[];
    for (const row of returned) inserted.push(row);
  }
  return inserted;
}

async function truncateTables() {
  console.log("Truncating tables");

  const { rows: tables } = await db.execute<{ table_name: string }>(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
  `);

  if (tables.length > 0) {
    const truncateCommand = `TRUNCATE TABLE ${tables.map((t) => `"${t.table_name}"`).join(", ")} CASCADE;`;
    await db.execute(sql.raw(truncateCommand));
    console.log("Selected tables truncated successfully.");
  } else {
    console.log("No tables to truncate. Make sure to run `npm run db:migrate` first.");
  }
}

function generateImplementers(n: number) {
  const implementers = [];

  for (let i = 0; i < n; i++) {
    implementers.push({
      id: objectId("impl"),
      visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
      implementerName: faker.company.name(),
      implementerType: "NGO",
      pointPersonName: faker.person.fullName(),
      pointPersonPhone: faker.helpers.fromRegExp("2547[1-9]{8}"),
      pointPersonEmail: faker.internet.email().toLowerCase(),
    });
  }

  return implementers;
}

function createImplementers() {
  console.log("creating implementers");
  return insertManyReturning(schema.implementer, [
    {
      id: objectId("impl"),
      visibleId: "SHA",
      implementerName: "Shamiri Institute",
      implementerType: "NGO",
      pointPersonName: "Tom Osborn",
      pointPersonPhone: "+254 (0) 11 254 0760",
      pointPersonEmail: "team@shamiri.institute",
    },
    ...generateImplementers(2),
  ]);
}

function createProjects() {
  console.log("creating projects");
  const projects = [];

  for (let i = 0; i < 4; i++) {
    projects.push({
      id: objectId("proj"),
      visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
      name: faker.company.name(),
      actualStartDate: startOfMonth(seedToday),
      actualEndDate: startOfMonth(seedToday),
      isDefault: i === 0,
    });
  }

  return insertManyReturning(schema.project, projects);
}

function createHubs(projects: Project[], implementers: Implementer[]) {
  console.log("creating hubs");
  const hubs = [];
  const minLength = Math.min(projects.length, implementers.length);

  hubs.push({
    id: objectId("hub"),
    ...arsenalHub,
    projectId: projects[0]?.id as string,
    implementerId: implementers[0]?.id as string,
  });

  for (let i = 0; i < minLength; i++) {
    const numHubs = faker.number.int({ min: 3, max: 6 });

    for (let j = 0; j < numHubs; j++) {
      hubs.push({
        id: objectId("hub"),
        visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
        hubName: faker.company.name(),
        projectId: projects[i]?.id as string,
        implementerId: implementers[i]?.id as string,
      });
    }
  }

  return insertManyReturning(schema.hub, hubs);
}

async function createCoreUsers(
  implementers: Implementer[],
  supervisors: Supervisor[],
  hubCoordinators: HubCoordinator[],
  fellows: Fellow[],
  clinicalLeads: ClinicalLead[],
  operations: OpsUser[],
  clinicalTeam: ClinicalTeam,
  admins: AdminUser[],
  hubs: Hub[],
  defaultProjectId: string,
) {
  console.log("creating core users");

  const currentProjectHubIds = new Set(
    hubs.filter((h) => h.projectId === defaultProjectId).map((h) => h.id),
  );
  const currentProjectImplementerIds = new Set(
    hubs.filter((h) => h.projectId === defaultProjectId).map((h) => h.implementerId),
  );

  const projectHubCoordinators = hubCoordinators.filter((hc) =>
    currentProjectHubIds.has(hc.assignedHubId ?? ""),
  );
  const projectSupervisors = supervisors.filter((s) => currentProjectHubIds.has(s.hubId ?? ""));
  const projectFellows = fellows.filter((f) => currentProjectHubIds.has(f.hubId ?? ""));
  const projectClinicalLeads = clinicalLeads.filter((cl) =>
    currentProjectHubIds.has(cl.assignedHubId ?? ""),
  );
  const projectOperations = operations.filter((o) =>
    currentProjectImplementerIds.has(o.implementerId),
  );

  const userData = [
    {
      id: objectId("user"),
      email: "benny@shamiri.institute",
      role: ImplementerRole.OPERATIONS,
    },
    {
      id: objectId("user"),
      email: "shadrack.lilan@shamiri.institute",
      role: ImplementerRole.SUPERVISOR,
    },
    {
      id: objectId("user"),
      email: "wambugu.davis@shamiri.institute",
      role: ImplementerRole.ADMIN,
    },
    {
      id: objectId("user"),
      email: "stanley.george@shamiri.institute",
      role: ImplementerRole.CLINICAL_LEAD,
    },
    {
      id: objectId("user"),
      email: "mmbone@shamiri.institute",
      role: ImplementerRole.SUPERVISOR,
    },
    {
      id: objectId("user"),
      email: "brandon.mochama@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "nickson.mugambi@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "marie.odhiambo@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "osborn@shamiri.institute",
      role: ImplementerRole.SUPERVISOR,
    },
  ];

  const users = await insertManyReturning(
    schema.user,
    userData.map(({ id, email }) => ({
      id,
      email,
      activeProjectId: defaultProjectId,
    })),
  );

  const membershipData = users.map((user) => {
    const role = userData.find((u) => u.id === user.id)?.role as ImplementerRole;
    if (role === ImplementerRole.ADMIN) {
      // Shares the Super Admin's profile of each implementer, so this user is a super admin there.
      return implementers.flatMap((implementer) => ({
        userId: user.id,
        implementerId: implementer.id,
        role,
        identifier: admins.find(
          (admin) => admin.email === superAdminEmail && admin.implementerId === implementer.id,
        )?.id,
      }));
    }
    const personnel =
      role === "HUB_COORDINATOR"
        ? faker.helpers.arrayElement(projectHubCoordinators)
        : role === "SUPERVISOR"
          ? faker.helpers.arrayElement(projectSupervisors)
          : role === "FELLOW"
            ? faker.helpers.arrayElement(projectFellows)
            : role === "CLINICAL_LEAD"
              ? faker.helpers.arrayElement(projectClinicalLeads)
              : role === "OPERATIONS"
                ? faker.helpers.arrayElement(projectOperations)
                : role === "CLINICAL_TEAM"
                  ? clinicalTeam
                  : null;
    const identifier = personnel?.id ?? undefined;
    const implementerId = personnel?.implementerId ?? implementers[0]?.id ?? "";
    return {
      userId: user.id,
      implementerId,
      role,
      identifier,
    };
  });

  await insertMany(schema.implementerMember, membershipData.flat());
}

async function createAdminUsers(
  implementers: Implementer[],
  emails: Set<string>,
  defaultProjectId: string,
) {
  console.log("creating admin users");

  const shamiri = implementers[0];
  if (!shamiri) {
    throw new Error("Cannot create admin users without an implementer");
  }

  type AdminPerson = {
    userId: string;
    email: string;
    adminName: string;
    implementerIds: string[];
    isSuperAdmin: boolean;
    team: AdminTeam | null;
  };

  const adminPeople: AdminPerson[] = [
    {
      userId: objectId("user"),
      email: superAdminEmail,
      adminName: "Super Admin",
      implementerIds: implementers.map((implementer) => implementer.id),
      isSuperAdmin: true,
      team: null,
    },
    ...implementers.flatMap((implementer) =>
      implementer.pointPersonEmail
        ? [
            {
              userId: objectId("user"),
              email: implementer.pointPersonEmail,
              adminName: `Admin (${implementer.implementerName})`,
              implementerIds: [implementer.id],
              isSuperAdmin: true,
              team: null,
            },
          ]
        : [],
    ),
    // a team admin and a plain admin, to exercise every access state
    {
      userId: objectId("user"),
      email: careAdminEmail,
      adminName: "Care Admin",
      implementerIds: [shamiri.id],
      isSuperAdmin: false,
      team: AdminTeam.CARE,
    },
    {
      userId: objectId("user"),
      email: researchAdminEmail,
      adminName: "Research Admin",
      implementerIds: [shamiri.id],
      isSuperAdmin: false,
      team: AdminTeam.RESEARCH,
    },
    {
      userId: objectId("user"),
      email: plainAdminEmail,
      adminName: "Plain Admin",
      implementerIds: [shamiri.id],
      isSuperAdmin: false,
      team: null,
    },
  ];

  const createdAdminUsers = await insertManyReturning(
    schema.adminUser,
    adminPeople.flatMap((person) =>
      person.implementerIds.map((implementerId) => ({
        id: objectId("admin"),
        email: person.email,
        adminName: person.adminName,
        implementerId,
        isSuperAdmin: person.isSuperAdmin,
        team: person.team,
      })),
    ) as (typeof schema.adminUser.$inferInsert)[],
  );

  const createdUsers = await insertManyReturning(
    schema.user,
    adminPeople.map((person) => ({
      id: person.userId,
      email: person.email,
      name: person.adminName,
      activeProjectId: defaultProjectId,
    })),
  );

  const userIdByEmail = new Map(adminPeople.map((person) => [person.email, person.userId]));
  const membershipData = createdAdminUsers.map((admin) => ({
    userId: userIdByEmail.get(admin.email) ?? "",
    implementerId: admin.implementerId,
    role: ImplementerRole.ADMIN,
    identifier: admin.id,
  }));

  await insertMany(schema.implementerMember, membershipData);

  createdUsers.forEach((user) => {
    emails.add(user.email ?? "");
  });

  return createdAdminUsers;
}

async function createHubCoordinators(arsenal: Hub, otherHubs: Hub[], emails: Set<string>) {
  console.log("creating hub coordinators");

  const staticCoordinators = arsenalCoordinators.map((coordinator) => ({
    id: objectId("coord"),
    ...coordinator,
    implementerId: arsenal.implementerId,
    assignedHubId: arsenal.id,
  }));

  const staticUsers = staticCoordinators.map((coord) => ({
    id: objectId("user"),
    email: coord.coordinatorEmail,
  }));

  await insertManyReturning(schema.user, staticUsers);

  const staticMembershipData = staticUsers.map((user, index) => ({
    userId: user.id,
    implementerId: arsenal.implementerId,
    role: ImplementerRole.HUB_COORDINATOR,
    identifier: staticCoordinators[index]?.id ?? "",
  }));

  await insertMany(schema.hubCoordinator, staticCoordinators);

  await insertMany(schema.implementerMember, staticMembershipData);

  staticCoordinators.forEach((coord) => {
    emails.add(coord.coordinatorEmail);
  });

  for (const hub of otherHubs) {
    let uniqueEmail = faker.internet.email().toLowerCase();
    while (emails.has(uniqueEmail)) {
      uniqueEmail = faker.internet.email().toLowerCase();
    }
    emails.add(uniqueEmail);

    const userId = objectId("user");
    const coordinatorId = objectId("coord");

    await db.insert(schema.user).values({
      id: userId,
      email: uniqueEmail,
    });

    const county = faker.helpers.arrayElement(KENYAN_COUNTIES);
    const subCounty = faker.helpers.arrayElement(county.sub_counties);
    const gender = faker.person.sexType();

    await db.insert(schema.hubCoordinator).values({
      id: coordinatorId,
      implementerId: hub.implementerId,
      visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
      coordinatorName: faker.person.fullName(),
      coordinatorEmail: uniqueEmail,
      county: county.name,
      subCounty: subCounty,
      bankName: faker.company.name(),
      bankBranch: faker.location.county(),
      bankAccountNumber: faker.finance.accountNumber(),
      bankAccountName: faker.person.fullName(),
      kra: faker.finance.accountNumber(),
      dateOfBirth: faker.date.birthdate(),
      cellNumber: faker.helpers.fromRegExp("2541[1-9]{8}"),
      mpesaNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
      gender: faker.number.float() > 0.9 ? "Other" : gender[0]?.toUpperCase() + gender.substring(1),
      idNumber: faker.string.numeric({ length: 8 }),
      assignedHubId: hub.id,
    });

    await db.insert(schema.implementerMember).values({
      userId,
      implementerId: hub.implementerId,
      role: ImplementerRole.HUB_COORDINATOR,
      identifier: coordinatorId,
    });
  }

  return db.query.hubCoordinator.findMany();
}

async function createSupervisors(arsenal: Hub, otherHubs: Hub[], emails: Set<string>, n = 6) {
  console.log("creating supervisors");
  const supervisors: (typeof schema.supervisor.$inferInsert)[] = [];

  const staticSupervisors = arsenalSupervisors.map((supervisor) => ({
    id: objectId("user"),
    ...supervisor,
    hubId: arsenal.id,
    implementerId: arsenal.implementerId,
  }));

  supervisors.push(...staticSupervisors);
  staticSupervisors.forEach((sup) => {
    emails.add(sup.supervisorEmail);
  });

  const dynamicSupervisors = otherHubs.flatMap((hub) => {
    return Array.from(Array(n).keys()).map(() => {
      let uniqueEmail = faker.internet.email().toLowerCase();
      while (emails.has(uniqueEmail)) {
        uniqueEmail = faker.internet.email().toLowerCase();
      }
      emails.add(uniqueEmail);

      return {
        id: objectId("user"),
        supervisorEmail: uniqueEmail,
        hubId: hub.id,
        implementerId: hub.implementerId,
        visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
      };
    });
  });

  supervisors.push(...dynamicSupervisors);

  const createSupervisors = await insertManyReturning(
    schema.user,
    supervisors.map(({ id, supervisorEmail }) => ({
      id,
      email: supervisorEmail,
    })),
  );

  const membershipData = createSupervisors.map((user) => ({
    userId: user.id,
    implementerId: supervisors.find((supervisor) => supervisor.id === user.id)?.implementerId ?? "",
    role: ImplementerRole.SUPERVISOR,
    identifier: objectId("sup"),
  }));

  const supervisorIdFor = (userId: string) =>
    membershipData.find((x) => x.userId === userId)?.identifier ?? "";
  const staticSupervisorRecords = staticSupervisors.map(({ id: userId, ...rest }) => ({
    id: supervisorIdFor(userId),
    ...rest,
  }));
  const dynamicSupervisorRecords = dynamicSupervisors.map((_user) => {
    const county = faker.helpers.arrayElement(KENYAN_COUNTIES);
    const subCounty = faker.helpers.arrayElement(county.sub_counties);
    const gender = faker.person.sexType();

    return {
      id: supervisorIdFor(_user.id),
      implementerId: _user.implementerId,
      visibleId: _user.visibleId || faker.string.alpha({ casing: "upper", length: 6 }),
      supervisorName: faker.person.fullName(),
      supervisorEmail: _user.supervisorEmail,
      county: county.name,
      subCounty: subCounty,
      bankName: faker.company.name(),
      bankBranch: faker.location.county(),
      bankAccountNumber: faker.finance.accountNumber(),
      bankAccountName: faker.person.fullName(),
      kra: faker.finance.accountNumber(),
      dateOfBirth: faker.date.birthdate(),
      cellNumber: faker.helpers.fromRegExp("2541[1-9]{8}"),
      mpesaNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
      gender: faker.number.float() > 0.9 ? "Other" : gender[0]?.toUpperCase() + gender.substring(1),
      idNumber: faker.string.numeric({ length: 8 }),
      hubId: _user.hubId,
    };
  });

  const created = await insertManyReturning(schema.supervisor, [
    ...staticSupervisorRecords,
    ...dynamicSupervisorRecords,
  ]);
  await insertMany(schema.implementerMember, membershipData);
  return created;
}

async function createOperations(arsenal: Hub, otherHubs: Hub[], emails: Set<string>) {
  console.log("creating operations users");
  const operations: (typeof schema.opsUser.$inferInsert)[] = [];

  const staticOps = {
    id: objectId("user"),
    ...arsenalOpsUser,
    implementerId: arsenal.implementerId,
  };
  operations.push(staticOps);
  emails.add(staticOps.email);

  for (const hub of otherHubs) {
    let uniqueEmail = faker.internet.email().toLowerCase();
    while (emails.has(uniqueEmail)) {
      uniqueEmail = faker.internet.email().toLowerCase();
    }
    emails.add(uniqueEmail);

    const opsUser = {
      id: objectId("user"),
      email: uniqueEmail,
      implementerId: hub.implementerId,
      name: faker.person.fullName(),
    };

    operations.push(opsUser);
  }

  const createdOperations = await insertManyReturning(
    schema.user,
    operations.map(({ id, email }) => ({
      id,
      email,
    })),
  );

  const membershipData = createdOperations.map((ops) => ({
    userId: ops.id,
    implementerId: operations.find((x) => x.id === ops.id)?.implementerId ?? "",
    role: ImplementerRole.OPERATIONS,
    identifier: objectId("opsuser"),
  }));

  const created = await insertManyReturning(
    schema.opsUser,
    operations.map((ops) => ({
      id: membershipData.find((x) => x.userId === ops.id)?.identifier ?? "",
      email: ops.email,
      name: ops.name,
      implementerId: ops.implementerId,
    })),
  );
  await insertMany(schema.implementerMember, membershipData);
  return created;
}

async function createClinicalLeads(arsenal: Hub, otherHubs: Hub[], emails: Set<string>) {
  console.log("creating clinical leads");
  const clinicalLeads: (typeof schema.clinicalLead.$inferInsert)[] = [];

  const staticClinicalLead = {
    id: objectId("user"),
    ...arsenalClinicalLead,
    implementerId: arsenal.implementerId,
    assignedHubId: arsenal.id,
  };
  clinicalLeads.push(staticClinicalLead);
  emails.add(staticClinicalLead.clinicalLeadEmail);

  for (const hub of otherHubs) {
    let uniqueEmail = faker.internet.email().toLowerCase();
    while (emails.has(uniqueEmail)) {
      uniqueEmail = faker.internet.email().toLowerCase();
    }
    emails.add(uniqueEmail);

    const clinicalLead = {
      id: objectId("user"),
      clinicalLeadEmail: uniqueEmail,
      clinicalLeadName: faker.person.fullName(),
      implementerId: hub.implementerId,
      assignedHubId: hub.id,
    };

    clinicalLeads.push(clinicalLead);
  }

  const createClinicalLeads = await insertManyReturning(
    schema.user,
    clinicalLeads.map(({ id, clinicalLeadEmail }) => ({
      id,
      email: clinicalLeadEmail,
    })),
  );

  const membershipData = createClinicalLeads.map((user) => ({
    userId: user.id,
    implementerId:
      clinicalLeads.find((clinicalLead) => clinicalLead.id === user.id)?.implementerId ?? "",
    role: ImplementerRole.CLINICAL_LEAD,
    identifier: objectId("clinicallead"),
  }));

  const created = await insertManyReturning(
    schema.clinicalLead,
    clinicalLeads.map((clinicalLead) => ({
      id: membershipData.find((x) => x.userId === clinicalLead.id)?.identifier ?? "",
      clinicalLeadName: clinicalLead.clinicalLeadName,
      clinicalLeadEmail: clinicalLead.clinicalLeadEmail,
      assignedHubId: clinicalLead.assignedHubId,
      implementerId: clinicalLead.implementerId,
    })),
  );
  await insertMany(schema.implementerMember, membershipData);
  return created;
}

async function createClinicalTeam(arsenal: Hub) {
  console.log("creating clinical team");
  const userId = objectId("user");
  const clinicalTeamId = objectId("clinicalteam");

  await db.insert(schema.user).values({
    id: userId,
    email: arsenalClinicalTeamMember.email,
  });

  const clinicalTeamMember = {
    id: clinicalTeamId,
    ...arsenalClinicalTeamMember,
    assignedHubId: arsenal.id,
    implementerId: arsenal.implementerId,
  };
  const [created] = await db.insert(schema.clinicalTeam).values(clinicalTeamMember).returning();
  if (!created) throw new Error("Clinical team member was not created");

  await db.insert(schema.implementerMember).values({
    userId,
    implementerId: arsenal.implementerId,
    role: ImplementerRole.CLINICAL_TEAM,
    identifier: clinicalTeamId,
  });
  return created;
}

const TWO_WEEKS_SCALE = [
  { code: "0", label: "Not at all" },
  { code: "1", label: "Several days" },
  { code: "2", label: "More than half the days" },
  { code: "3", label: "Nearly every day" },
];

/** The seeded baseline: consent, a few questions, and a short grid, over two pages. */
const BASELINE_FORM: SurveyForm = {
  format: 1,
  pages: [
    {
      title: "About you",
      items: [
        { id: "consent-heading", kind: "heading", text: "Informed consent" },
        {
          id: "consent-text",
          kind: "paragraph",
          text: "Your answers are private and will only be used to improve the programme.",
        },
        { id: "consent", kind: "signature", key: "consent", prompt: "Signature", required: true },
        { id: "about-heading", kind: "heading", text: "About you" },
        {
          id: "age",
          kind: "number",
          key: "age",
          prompt: "How old are you?",
          required: true,
          digits: 2,
          min: 10,
          max: 25,
        },
        {
          id: "gender",
          kind: "single_choice",
          key: "gender",
          prompt: "What is your gender?",
          required: true,
          options: [
            { code: "F", label: "Female" },
            { code: "M", label: "Male" },
            { code: "X", label: "Prefer not to say" },
          ],
        },
        {
          id: "dob",
          kind: "date",
          key: "date_of_birth",
          prompt: "When were you born?",
          required: false,
        },
      ],
    },
    {
      title: "How you feel",
      items: [
        {
          id: "phq-intro",
          kind: "paragraph",
          text: "Over the last two weeks, how often have you been bothered by the following?",
        },
        {
          id: "phq",
          kind: "grid",
          key: "phq",
          prompt: "Over the last two weeks",
          required: true,
          options: TWO_WEEKS_SCALE,
          rows: [
            { key: "1", label: "Little interest or pleasure in doing things" },
            { key: "2", label: "Feeling sad, depressed or hopeless" },
          ],
        },
        {
          id: "wellbeing",
          kind: "single_choice",
          key: "wellbeing",
          prompt: "How happy do you feel at school?",
          required: true,
          options: ["1", "2", "3", "4", "5"].map((code) => ({ code, label: code })),
        },
        {
          id: "comments",
          kind: "text",
          key: "comments",
          prompt: "Is there anything else you would like to tell us?",
          required: false,
          lines: 4,
        },
      ],
    },
  ],
};

/** A published baseline survey made by the Research team admin, with pages that mix question types. */
async function createResearchSurveys(projectId: string) {
  console.log("creating research surveys");
  const researchAdmin = await db.query.adminUser.findFirst({
    where: (a, { eq }) => eq(a.email, researchAdminEmail),
    columns: { implementerId: true },
  });
  const researchAdminUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, researchAdminEmail),
    columns: { id: true },
  });
  if (!researchAdmin || !researchAdminUser)
    throw new Error("No Research team admin to own the survey");
  const createdBy = researchAdminUser.id;

  const [survey] = await db
    .insert(schema.survey)
    .values({
      implementerId: researchAdmin.implementerId,
      projectId,
      code: "BASE26",
      title: "Baseline wellbeing survey",
      description: "Given to every student before the intervention starts.",
      createdBy,
    })
    .returning();
  if (!survey) throw new Error("Research survey was not created");

  // Written as a draft, then published: a version is created as a draft and frozen once published.
  const [version] = await db
    .insert(schema.surveyVersion)
    .values({ surveyId: survey.id, versionNumber: 1, createdBy, form: BASELINE_FORM })
    .returning();
  if (!version) throw new Error("Research survey version was not created");

  await db
    .update(schema.surveyVersion)
    .set({ status: SurveyVersionStatus.PUBLISHED })
    .where(eq(schema.surveyVersion.id, version.id));
  await db
    .update(schema.survey)
    .set({ status: SurveyStatus.ACTIVE })
    .where(eq(schema.survey.id, survey.id));
}

async function createFellows(arsenal: Hub, supervisors: Supervisor[], emails: Set<string>) {
  console.log("creating fellows");
  const fellows: (typeof schema.fellow.$inferInsert)[] = [];

  const staticFellows = arsenalFellows.map(({ supervisorVisibleId, ...fellow }) => {
    const supervisor = supervisors.find((s) => s.visibleId === supervisorVisibleId);
    return {
      id: objectId("user"),
      ...fellow,
      supervisorId: supervisor?.id,
      hubId: supervisor?.hubId,
      implementerId: supervisor?.implementerId,
    };
  });
  fellows.push(...staticFellows);
  staticFellows.forEach((fellow) => {
    emails.add(fellow.fellowEmail);
  });

  const counties = KENYAN_COUNTIES.map((county) => {
    const { name, sub_counties } = county;
    return { name, sub_counties };
  });

  for (const supervisor of supervisors.filter((s) => s.hubId !== arsenal.id)) {
    const numFellows = faker.number.int({ min: 10, max: 15 });
    const subCounties = counties.find((county) => county.name === supervisor.county)?.sub_counties;

    for (let i = 0; i < numFellows; i++) {
      const gender = faker.person.sexType();
      const fellowName = faker.person.fullName({ sex: gender });

      let uniqueEmail = faker.internet.email().toLowerCase();
      while (emails.has(uniqueEmail)) {
        uniqueEmail = faker.internet.email().toLowerCase();
      }
      emails.add(uniqueEmail);

      fellows.push({
        id: objectId("user"),
        visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
        fellowName,
        fellowEmail: uniqueEmail,
        mpesaName: faker.number.float() > 0.5 ? fellowName : faker.person.fullName(),
        mpesaNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
        supervisorId: supervisor.id,
        hubId: supervisor.hubId,
        implementerId: supervisor.implementerId,
        county: supervisor.county,
        subCounty: subCounties ? faker.helpers.arrayElement(subCounties) : supervisor.subCounty,
        dateOfBirth: faker.date.birthdate(),
        cellNumber: faker.helpers.fromRegExp("2541[1-9]{8}"),
        gender:
          faker.number.float() > 0.9 ? "Other" : gender[0]?.toUpperCase() + gender.substring(1),
        idNumber: faker.string.numeric({ length: 8 }),
      });
    }
  }

  const createFellows = await insertManyReturning(
    schema.user,
    fellows.map(({ id, fellowEmail }) => ({
      id,
      email: fellowEmail,
    })),
  );

  const membershipData = createFellows.map((user) => ({
    userId: user.id,
    implementerId: fellows.find((fellow) => fellow.id === user.id)?.implementerId ?? "",
    role: ImplementerRole.FELLOW,
    identifier: objectId("fellow"),
  }));

  const created = await insertManyReturning(
    schema.fellow,
    fellows.map((fellow) => {
      const { id, ..._fellow } = fellow;
      return {
        id: membershipData.find((fellow) => fellow.userId === id)?.identifier ?? "",
        ..._fellow,
      };
    }),
  );
  await insertMany(schema.implementerMember, membershipData);
  return created;
}

async function createSchools(
  hubs: Hub[],
  arsenal: Hub,
  otherHubs: Hub[],
  supervisors: Supervisor[],
) {
  console.log("creating schools");
  const schools: (typeof schema.school.$inferInsert)[] = [];

  for (const { supervisorVisibleId, ...school } of [emiratesAcademy, sobhaAcademy]) {
    schools.push({
      id: objectId("sch"),
      ...school,
      hubId: arsenal.id,
      assignedSupervisorId: supervisors.find((s) => s.visibleId === supervisorVisibleId)?.id,
    });
  }

  otherHubs.forEach((hub) => {
    const hubSupervisors = supervisors.filter((supervisor) => supervisor.hubId === hub.id);
    const numSchools = faker.number.int({
      min: hubSupervisors.length,
      max: hubSupervisors.length * 2,
    });

    for (let i = 0; i < numSchools; i++) {
      const county = faker.helpers.arrayElement(KENYAN_COUNTIES);
      const subCounty = faker.helpers.arrayElement(county.sub_counties);

      schools.push({
        id: objectId("sch"),
        visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
        schoolName: faker.company.name(),
        hubId: hub.id,
        schoolType: faker.helpers.arrayElement(SCHOOL_TYPES),
        schoolEmail: faker.internet.email(),
        schoolCounty: county.name,
        schoolSubCounty: subCounty,
        schoolDemographics: faker.helpers.arrayElement(["Boys", "Girls", "Mixed"]),
        pointPersonName: faker.person.fullName(),
        pointPersonPhone: faker.helpers.fromRegExp("2547[1-9]{8}"),
        numbersExpected: faker.number.int({ min: 400, max: 900 }),
        principalName: faker.person.fullName(),
        droppedOut: false,
        dropoutReason: null,
        droppedOutAt: null,
        assignedSupervisorId: faker.helpers.arrayElement(hubSupervisors).id,
      });
    }
  });

  const created = await insertManyReturning(schema.school, schools);
  return created.map((school) => ({
    ...school,
    hub: hubs.find((hub) => hub.id === school.hubId) ?? null,
  }));
}

type SchoolCreationResult = Awaited<ReturnType<typeof createSchools>>;

function leastAssignedFellow(fellows: Fellow[], schoolCountByFellowId: Map<string, number>) {
  return fellows
    .map((fellow) => ({ id: fellow.id, count: schoolCountByFellowId.get(fellow.id) ?? 0 }))
    .toSorted((a, b) => a.count - b.count)[0]?.id;
}

async function createInterventionGroups(schools: SchoolCreationResult, fellows: Fellow[]) {
  console.log("creating intervention groups");
  const interventionGroups: (typeof schema.interventionGroup.$inferInsert)[] = [];

  const staticSchool = schools.find((s) => s.visibleId === emiratesAcademy.visibleId);
  const arsenalFellowIds = new Set(arsenalFellows.map((f) => f.visibleId));
  const staticFellows = fellows.filter((f) => f.visibleId && arsenalFellowIds.has(f.visibleId));

  staticFellows.forEach((fellow, index) => {
    interventionGroups.push({
      id: objectId("group"),
      groupName: `Group ${index + 1}`,
      schoolId: staticSchool?.id ?? "",
      leaderId: fellow.id,
      projectId: staticSchool?.hub?.projectId as string,
      groupType: faker.number.float() > 0.95 ? "TREATMENT" : "CONTROL",
    });
  });

  const schoolFellowAssignments = new Map<string, Set<string>>();
  const fellowSchoolCount = new Map<string, number>();

  for (const fellow of fellows) {
    fellowSchoolCount.set(fellow.id, 0);
  }

  for (const school of schools.filter((s) => s !== staticSchool)) {
    const numGroups = school.numbersExpected
      ? Math.ceil(school.numbersExpected / 16)
      : Math.ceil(1000 / 16);

    schoolFellowAssignments.set(school.id, new Set());

    for (let i = 0; i < numGroups; i++) {
      const availableFellows = fellows.filter(
        (fellow) =>
          fellow.hubId === school.hubId && !schoolFellowAssignments.get(school.id)?.has(fellow.id),
      );

      if (!availableFellows.length) {
        console.warn(`No available fellows for school ${school.schoolName}.`);
        break;
      }

      const leader = leastAssignedFellow(availableFellows, fellowSchoolCount);

      if (!leader) {
        console.warn(`No fellows assigned for school ${school.schoolName}`);
        continue;
      }

      schoolFellowAssignments.get(school.id)?.add(leader);
      fellowSchoolCount.set(leader, (fellowSchoolCount.get(leader) ?? 0) + 1);

      interventionGroups.push({
        id: objectId("group"),
        groupName: faker.company.name(),
        schoolId: school.id,
        leaderId: leader,
        projectId: school.hub?.projectId as string,
        groupType: "TREATMENT",
      });
    }
  }

  return insertManyReturning(schema.interventionGroup, interventionGroups);
}

function loadSchoolsWithGroupsAndHub() {
  return db.query.school.findMany({
    with: {
      interventionGroups: {
        with: {
          leader: true,
        },
      },
      hub: true,
    },
  });
}

type DemoSchool = Awaited<ReturnType<typeof loadSchoolsWithGroupsAndHub>>[number];

async function createStudentsForSchools(schools: DemoSchool[]) {
  console.log("creating students");
  const students: (typeof schema.student.$inferInsert)[] = [];

  const staticSchool = schools.find((s) => s.visibleId === emiratesAcademy.visibleId);
  const staticGroups = staticSchool?.interventionGroups ?? [];

  staticGroups.forEach((group, groupIndex) => {
    for (let i = 0; i < 10; i++) {
      students.push({
        id: objectId("stu"),
        visibleId: `STATIC_STU_${groupIndex + 1}_${i + 1}`,
        studentName: `Student ${groupIndex + 1}.${i + 1}`,
        admissionNumber: `ADM_${groupIndex + 1}_${i + 1}`,
        schoolId: staticSchool?.id,
        assignedGroupId: group.id,
        gender: i % 2 === 0 ? "Male" : "Female",
        yearOfBirth: 2008,
        form: 2,
        stream: "East",
      });
    }
  });

  for (const school of schools.filter((s) => s !== staticSchool)) {
    const numStudents = faker.number.int({
      min: school.numbersExpected || 1000 - Math.ceil(faker.number.float() * 60),
      max: school.numbersExpected || 1000,
    });
    for (let i = 0; i < numStudents; i++) {
      students.push({
        id: objectId("stu"),
        visibleId: objectId("student"),
        studentName: faker.person.fullName(),
        admissionNumber: faker.string.numeric({ length: 5 }),
        schoolId: school.id,
        assignedGroupId: faker.helpers.arrayElement(school.interventionGroups).id,
        gender: faker.helpers.arrayElement(["Male", "Female"]),
        yearOfBirth: faker.date.birthdate({ mode: "age", min: 12, max: 20 }).getFullYear(),
        form: faker.number.int({ min: 1, max: 4 }),
        stream: faker.helpers.arrayElement(["East", "West", "North", "South"]),
      });
    }
  }

  return insertManyReturning(schema.student, students);
}

async function createSessionNames(hubs: Hub[]) {
  console.log("creating session names");
  const sessionNamesRecords: (typeof schema.sessionName.$inferInsert)[] = [];

  for (const hub of hubs) {
    for (const sessionType of seedHubSessionTypes) {
      sessionNamesRecords.push({
        id: objectId("sessionname"),
        sessionType: sessionType.type,
        sessionName: sessionType.name,
        sessionLabel: sessionType.label,
        hubId: hub.id,
        currency: "KES",
        amount: sessionType.amount,
      });
    }
  }

  const sessions = await insertManyReturning(schema.sessionName, sessionNamesRecords);

  return sessions.reduce<
    Record<"interventionSessionsNames" | "followUpSessionsNames", SessionName[]>
  >(
    (acc, val) => {
      if (val.sessionType === sessionTypes.INTERVENTION) {
        acc.interventionSessionsNames.push(val);
      } else {
        acc.followUpSessionsNames.push(val);
      }
      return acc;
    },
    { interventionSessionsNames: [], followUpSessionsNames: [] },
  );
}

function nextFreeDate(
  from: Date,
  fellowIds: Set<string>,
  busyDatesByFellowId: Map<string, Set<string>>,
) {
  let date = from;
  while (
    Array.from(fellowIds).some((fellowId) =>
      busyDatesByFellowId.get(fellowId)?.has(date.toISOString().split("T")[0] ?? ""),
    )
  ) {
    date = addDays(date, 1);
  }
  return date;
}

async function createInterventionSessionsForSchools(
  schools: DemoSchool[],
  interventionSessionNames: SessionName[],
) {
  console.log("creating intervention sessions");
  const interventionSessions: (typeof schema.interventionSession.$inferInsert)[] = [];
  const fellowSessionDates = new Map<string, Set<string>>();

  const staticSchool = schools.find((s) => s.visibleId === emiratesAcademy.visibleId);
  const staticSessionNames = interventionSessionNames.filter(
    (sn) => sn.hubId === staticSchool?.hub?.id,
  );

  let staticDate = addHours(subWeeks(seedToday, SESSION_WEEKS_BEFORE_TODAY), 16);

  const usedStaticSessionTypes = new Set<string>();

  for (const sessionName of staticSessionNames) {
    if (usedStaticSessionTypes.has(sessionName.sessionName)) continue;
    usedStaticSessionTypes.add(sessionName.sessionName);

    interventionSessions.push({
      id: objectId("session"),
      sessionDate: staticDate,
      status: "Scheduled",
      sessionType: sessionName.sessionName,
      sessionId: sessionName.id,
      schoolId: staticSchool?.id,
      // The past week stays unmarked here, so e2e tests can mark a past session through the UI.
      occurred: isBefore(staticDate, subWeeks(seedToday, 1)),
      yearOfImplementation: 2024,
      projectId: staticSchool?.hub?.projectId || undefined,
      hubId: staticSchool?.hubId,
    });

    staticDate = addWeeks(staticDate, 1);
  }

  for (const school of schools.filter((s) => s !== staticSchool)) {
    if (!school.hubId) continue;

    const schoolSessionNames = interventionSessionNames.filter((sn) => sn.hubId === school.hub?.id);

    const usedSessionTypes = new Set<string>();

    const fellowsInSchool = school.interventionGroups.map((group) => group.leader);
    const fellowIds = new Set(fellowsInSchool.map((f) => f.id));

    let currentDate = addHours(subWeeks(seedToday, SESSION_WEEKS_BEFORE_TODAY), 9);

    for (const sessionName of schoolSessionNames) {
      if (usedSessionTypes.has(sessionName.sessionName)) continue;
      usedSessionTypes.add(sessionName.sessionName);

      currentDate = nextFreeDate(currentDate, fellowIds, fellowSessionDates);

      interventionSessions.push({
        id: objectId("session"),
        sessionDate: currentDate,
        status: "Scheduled",
        sessionType: sessionName.sessionName,
        sessionId: sessionName.id,
        schoolId: school.id,
        occurred: isBefore(currentDate, seedToday),
        yearOfImplementation: seedToday.getFullYear(),
        projectId: school.hub?.projectId || undefined,
        hubId: school.hubId,
      });

      fellowsInSchool.forEach((fellow) => {
        if (!fellowSessionDates.has(fellow.id)) {
          fellowSessionDates.set(fellow.id, new Set());
        }
        fellowSessionDates.get(fellow.id)?.add(currentDate.toISOString().split("T")[0] ?? "");
      });

      currentDate = addWeeks(currentDate, 1);
    }
  }

  return insertManyReturning(schema.interventionSession, interventionSessions);
}

const DEMO_SCHOOL_SAMPLE = 8; // schools enriched with the records below
const DEMO_GROUPS_PER_SCHOOL = 6; // cap groups enriched per school
const DEMO_STUDENTS_PER_SCHOOL = 25; // students given attendance/outcomes per school
const DEMO_CLINICAL_CASES_PER_SCHOOL = 2; // clinical cases opened per school
const DEMO_PAYOUT_SAMPLE = 80; // fellow-attendance rows backing payout flows
const TREATMENT_INTERVENTIONS = [
  "CBT",
  "Behavioural Activation",
  "Psychoeducation",
  "Problem Solving Therapy",
  "Mindfulness",
];

type DemoStudents = Awaited<ReturnType<typeof createStudentsForSchools>>;
type DemoSessions = Awaited<ReturnType<typeof createInterventionSessionsForSchools>>;
type DemoFellowAttendances = Awaited<
  ReturnType<typeof createAttendanceRecords>
>["fellowAttendances"];

async function createAttendanceRecords(
  schools: DemoSchool[],
  studentsBySchool: Map<string, DemoStudents>,
  sessionsBySchool: Map<string, DemoSessions>,
  seederUserId: string,
) {
  console.log("creating attendance records");

  const fellowAttendanceData: (typeof schema.fellowAttendance.$inferInsert)[] = [];
  const studentAttendanceData: (typeof schema.studentAttendance.$inferInsert)[] = [];
  const supervisorAttendanceData: (typeof schema.supervisorAttendance.$inferInsert)[] = [];

  for (const school of schools) {
    const projectId = school.hub?.projectId;
    if (!projectId) continue;

    const sessions = sessionsBySchool.get(school.id) ?? [];
    const groups = school.interventionGroups.slice(0, DEMO_GROUPS_PER_SCHOOL);
    const students = (studentsBySchool.get(school.id) ?? []).slice(0, DEMO_STUDENTS_PER_SCHOOL);

    for (const session of sessions) {
      for (const group of groups) {
        fellowAttendanceData.push({
          fellowId: group.leaderId,
          sessionId: session.id,
          schoolId: school.id,
          supervisorId: school.assignedSupervisorId ?? undefined,
          groupId: group.id,
          sessionDate: session.sessionDate,
          yearOfImplementation: session.yearOfImplementation ?? undefined,
          attended: faker.datatype.boolean({ probability: 0.9 }),
          markedBy: seederUserId,
        });
      }

      if (school.assignedSupervisorId) {
        supervisorAttendanceData.push({
          supervisorId: school.assignedSupervisorId,
          sessionId: session.id,
          attended: faker.datatype.boolean({ probability: 0.9 }),
          markedBy: seederUserId,
        });
      }

      for (const student of students) {
        const group = groups.find((g) => g.id === student.assignedGroupId);
        studentAttendanceData.push({
          studentId: student.id,
          sessionId: session.id,
          groupId: student.assignedGroupId ?? undefined,
          fellowId: group?.leaderId,
          attended: faker.datatype.boolean({ probability: 0.85 }),
          markedBy: seederUserId,
        });
      }
    }
  }

  const fellowAttendances = await insertManyReturning(
    schema.fellowAttendance,
    fellowAttendanceData,
  );
  const studentAttendances = await insertManyReturning(
    schema.studentAttendance,
    studentAttendanceData,
  );
  await insertMany(schema.supervisorAttendance, supervisorAttendanceData);

  return { fellowAttendances, studentAttendances };
}

/**
 * Fellow and supervisor attendance at the schools outside the demo sample, so each hub has about
 * as many attendance rows as a production hub (2,400 to 5,800 fellow rows in October 2026).
 */
async function createHubAttendance(
  schools: DemoSchool[],
  sessions: DemoSessions,
  seederUserId: string,
) {
  console.log("creating hub attendance");
  const fellowAttendanceData: (typeof schema.fellowAttendance.$inferInsert)[] = [];
  const supervisorAttendanceData: (typeof schema.supervisorAttendance.$inferInsert)[] = [];
  for (const school of schools) {
    const projectId = school.hub?.projectId;
    if (!projectId) continue;
    for (const session of sessions.filter((s) => s.schoolId === school.id)) {
      for (const group of school.interventionGroups) {
        fellowAttendanceData.push({
          fellowId: group.leaderId,
          sessionId: session.id,
          schoolId: school.id,
          supervisorId: school.assignedSupervisorId ?? undefined,
          groupId: group.id,
          sessionDate: session.sessionDate,
          yearOfImplementation: session.yearOfImplementation ?? undefined,
          attended: faker.datatype.boolean({ probability: 0.9 }),
          markedBy: seederUserId,
        });
      }
      if (school.assignedSupervisorId) {
        supervisorAttendanceData.push({
          supervisorId: school.assignedSupervisorId,
          sessionId: session.id,
          attended: faker.datatype.boolean({ probability: 0.9 }),
          markedBy: seederUserId,
        });
      }
    }
  }
  await insertMany(schema.fellowAttendance, fellowAttendanceData);
  await insertMany(schema.supervisorAttendance, supervisorAttendanceData);
}

async function createStudentOutcomes(
  schools: DemoSchool[],
  studentsBySchool: Map<string, DemoStudents>,
  groupTypeByGroupId: Map<string, string>,
) {
  console.log("creating student outcomes");
  const outcomes: (typeof schema.studentOutcome.$inferInsert)[] = [];
  const score = () => faker.number.int({ min: 0, max: 3 });

  for (const school of schools) {
    const students = (studentsBySchool.get(school.id) ?? []).slice(0, DEMO_STUDENTS_PER_SCHOOL);
    for (const student of students) {
      const condition = student.assignedGroupId
        ? (groupTypeByGroupId.get(student.assignedGroupId) ?? "CONTROL")
        : "CONTROL";
      // Baseline (0) and endpoint (1) time points
      for (const timePoint of [0, 1]) {
        outcomes.push({
          id: objectId("outcome"),
          shamiriId: student.visibleId,
          timePoint,
          yearOfImplementation: seedToday.getFullYear(),
          condition,
          phq1: score(),
          phq2: score(),
          phq3: score(),
          phq4: score(),
          gad1: score(),
          gad2: score(),
          gad3: score(),
          gad4: score(),
        });
      }
    }
  }

  await insertMany(schema.studentOutcome, outcomes);
}

async function createClinicalRecords(
  schools: DemoSchool[],
  studentsBySchool: Map<string, DemoStudents>,
  sessionsBySchool: Map<string, DemoSessions>,
  groupLeaderByGroupId: Map<string, string>,
  seederUserId: string,
) {
  console.log("creating clinical records");

  const screeningData: (typeof schema.clinicalScreeningInfo.$inferInsert)[] = [];
  const sessionData: (typeof schema.clinicalSessionAttendance.$inferInsert)[] = [];
  const notesData: (typeof schema.clinicalCaseNotes.$inferInsert)[] = [];
  const followUpData: (typeof schema.clinicalFollowUpTreatmentPlan.$inferInsert)[] = [];
  const terminationData: (typeof schema.clinicalCaseTermination.$inferInsert)[] = [];
  const triageData: (typeof schema.triageEvent.$inferInsert)[] = [];

  const CASE_STATUSES = [
    caseStatusOptions.Active,
    caseStatusOptions.FollowUp,
    caseStatusOptions.Terminated,
    caseStatusOptions.Referred,
  ];
  let caseIndex = 0;

  for (const school of schools) {
    const caseStudents = (studentsBySchool.get(school.id) ?? []).slice(
      0,
      DEMO_CLINICAL_CASES_PER_SCHOOL,
    );
    const sessions = sessionsBySchool.get(school.id) ?? [];

    for (const student of caseStudents) {
      const caseStatus =
        CASE_STATUSES[caseIndex % CASE_STATUSES.length] ?? caseStatusOptions.Active;
      caseIndex += 1;
      const riskStatus = faker.helpers.arrayElement([
        riskStatusOptions.Low,
        riskStatusOptions.Medium,
        riskStatusOptions.High,
      ]);
      const caseId = objectId("case");

      screeningData.push({
        id: caseId,
        studentId: student.id,
        caseStatus,
        riskStatus,
        currentSupervisorId: school.assignedSupervisorId ?? undefined,
        acceptCase: true,
        referralStatus: referralStatusOptions.Approved,
        pseudonym: `${faker.color.human()}-${faker.animal.type()}`,
        generalPresentingIssues: faker.helpers.arrayElement([
          "Academic stress",
          "Anxiety",
          "Low mood",
          "Family conflict",
          "Peer relationships",
        ]),
        anxiety: true,
        academicStruggles: faker.datatype.boolean(),
        referralReason: faker.lorem.sentence(),
        referralNotes: faker.lorem.paragraph(),
        progressNotes: faker.internet.url(),
        flagged: riskStatus === riskStatusOptions.High,
        flaggedReason: riskStatus === riskStatusOptions.High ? faker.lorem.sentence() : undefined,
      });

      const numClinicalSessions = faker.number.int({ min: 2, max: 3 });
      const clinicalSessionIds: string[] = [];
      for (let s = 0; s < numClinicalSessions; s++) {
        const clinicalSessionId = objectId("csess");
        clinicalSessionIds.push(clinicalSessionId);

        sessionData.push({
          id: clinicalSessionId,
          caseId,
          session: `Clinical Session ${s + 1}`,
          supervisorId: school.assignedSupervisorId ?? undefined,
          attendanceStatus: true,
        });

        notesData.push({
          caseId,
          sessionId: clinicalSessionId,
          createdBy: seederUserId,
          presentingIssues: faker.lorem.sentence(),
          orsAssessment: faker.number.int({ min: 0, max: 40 }),
          riskLevel: riskStatus,
          necessaryConditions: faker.lorem.sentence(),
          treatmentInterventions: faker.helpers.arrayElements(TREATMENT_INTERVENTIONS, {
            min: 1,
            max: 3,
          }),
          otherIntervention: faker.lorem.words(3),
          interventionExplanation: faker.lorem.sentence(),
          studentResponseExplanations: faker.lorem.paragraph(),
          followUpPlan: faker.helpers.arrayElement([
            FollowUpPlanOptions.GROUP,
            FollowUpPlanOptions.INDIVIDUAL,
          ]),
          followUpPlanExplanation: faker.lorem.sentence(),
        });
      }

      if (caseStatus === caseStatusOptions.FollowUp) {
        followUpData.push({
          caseId,
          currentORSScore: faker.number.int({ min: 0, max: 40 }),
          plannedSessions: faker.number.int({ min: 2, max: 8 }),
          sessionFrequency: faker.helpers.arrayElement(["Weekly", "Bi-weekly", "Monthly"]),
          plannedTreatmentIntervention: faker.helpers.arrayElements(TREATMENT_INTERVENTIONS, {
            min: 1,
            max: 3,
          }),
          plannedTreatmentInterventionExplanation: faker.lorem.sentence(),
        });
      }

      const lastClinicalSessionId = clinicalSessionIds.at(-1);
      if (caseStatus === caseStatusOptions.Terminated && lastClinicalSessionId) {
        terminationData.push({
          caseId,
          sessionId: lastClinicalSessionId,
          createdBy: seederUserId,
          terminationDate: faker.date.recent({ days: 30 }),
          terminationReason: faker.helpers.arrayElement([
            "Goals met",
            "Referred out",
            "Student relocated",
            "Dropped out",
          ]),
          terminationReasonExplanation: faker.lorem.sentence(),
        });
      }

      const firstSession = sessions[0];
      const fellowId = student.assignedGroupId
        ? groupLeaderByGroupId.get(student.assignedGroupId)
        : undefined;
      if (firstSession && fellowId) {
        triageData.push({
          sessionId: firstSession.id,
          studentId: student.id,
          fellowId,
          hubId: school.hubId ?? undefined,
          triageOccurred: true,
          riskScreenOutcome: RiskScreenOutcome.ANY_YES,
          actionTaken: TriageActionTaken.REFERRED,
          referredSupervisorId: school.assignedSupervisorId ?? undefined,
          note: faker.lorem.sentence(),
        });
      }
    }
  }

  await insertMany(schema.clinicalScreeningInfo, screeningData);
  await insertMany(schema.clinicalSessionAttendance, sessionData);
  await Promise.all([
    insertMany(schema.clinicalCaseNotes, notesData),
    insertMany(schema.clinicalCaseTermination, terminationData),
    insertMany(schema.clinicalFollowUpTreatmentPlan, followUpData),
    insertMany(schema.triageEvent, triageData),
  ]);
}

async function createPayoutRecords(
  fellowAttendances: DemoFellowAttendances,
  hubIdBySchoolId: Map<string, string>,
  seederUserId: string,
) {
  console.log("creating payout records");

  const eligible = fellowAttendances.filter(
    (fa) => fa.supervisorId && fa.schoolId && hubIdBySchoolId.has(fa.schoolId),
  );
  const sample = eligible.slice(0, DEMO_PAYOUT_SAMPLE);

  const payoutStatementData = sample.map((fa) => ({
    fellowAttendanceId: fa.id,
    amount: faker.number.int({ min: 500, max: 3000 }),
    reason: faker.helpers.arrayElement([
      "timely_attendance",
      "delayed_attendance",
      "reconciliation",
    ]),
    notes: faker.lorem.sentence(),
    createdBy: seederUserId,
    executedAt: faker.date.recent({ days: 30 }),
    mpesaNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
  }));

  await insertMany(schema.payoutStatements, payoutStatementData);
}

const FIDELITY_QUESTIONS = [
  {
    key: "question_1_protocol_adherence",
    justifications: [
      "All mandatory protocol elements were delivered in order, including the confidentiality agreement at the start and a structured wrap-up at the end.",
      "Most protocol steps were followed, though the confidentiality explanation was rushed and the closing reflection was only partially completed.",
      "Several mandatory elements were missing — the confidentiality agreement was skipped and the session ended without the required reflection.",
    ],
  },
  {
    key: "question_2_content_specifications",
    justifications: [
      "The facilitator covered every required content point and guided students through the corresponding workbook activities.",
      "Core content was covered, but the delivery skipped some of the specified facilitation techniques.",
      "Key content topics were addressed only briefly and one workbook activity was omitted.",
    ],
  },
  {
    key: "question_3_thoroughness",
    justifications: [
      "Activities were given ample time and discussions explored each student's contribution in depth.",
      "Thoroughness was mixed — individual work was well paced but group discussion stayed surface-level.",
      "The session felt rushed, with limited time for reflection and a hurried conclusion.",
    ],
  },
  {
    key: "question_4_skillful_delivery",
    justifications: [
      "Strong use of open-ended questions, active listening and theme-linking across students.",
      "Good rapport overall, though a few opportunities to reflect student input back were missed.",
      "Delivery was functional but relied on closed questions and offered little validation.",
    ],
  },
  {
    key: "question_5_clarity_accessibility",
    justifications: [
      "Concepts were broken down clearly with relatable, age-appropriate examples.",
      "Instructions were mostly clear but a couple of terms needed further explanation.",
      "Some instructions were ambiguous, leaving students unsure how to start the activity.",
    ],
  },
  {
    key: "question_6_protocol_boundaries",
    justifications: [
      "The facilitator stayed within the curriculum and used personal examples appropriately to model activities.",
      "Boundaries were generally maintained, with one minor over-disclosure during a discussion.",
      "The session drifted into off-curriculum content on a few occasions.",
    ],
  },
] as const;

const OVERALL_ASSESSMENTS = [
  "High fidelity overall. The facilitator delivered the protocol confidently while keeping the group engaged and safe.",
  "Moderate fidelity with a few gaps. Core content was covered but some procedural techniques were inconsistent.",
  "Developing fidelity. The facilitator showed promise in rapport-building but omitted several mandatory protocol steps.",
  "Strong session with minor refinements needed around pacing and the structured close.",
];

const RECOMMENDATIONS_POOL = [
  "Review and rehearse the confidentiality script so it is delivered consistently at the start of every session.",
  "Practise the rephrasing technique to confirm understanding and surface key student contributions.",
  "Use a closing cheat-sheet to ensure the 3-step reflection is completed before ending the session.",
  "Plan timeboxes for each activity to avoid a rushed conclusion.",
  "In supervision, role-play handling sensitive disclosures using the warm-handoff protocol.",
  "Invite quieter students to contribute with targeted open-ended questions.",
];

const STRENGTHS_POOL = [
  "Consistent use of open-ended questions to draw out student experiences.",
  "Warm, encouraging tone that created a safe space for sharing.",
  "Effective use of verbal nodding and active listening throughout.",
  "Connected themes across students to build a sense of shared experience.",
  "Handled a sensitive disclosure with empathy and a clear offer of follow-up.",
  "Good use of silence to allow students time for individual reflection.",
];

const IMPROVEMENTS_POOL = [
  "Deliver the confidentiality explanation in full at the start of the session.",
  "Use rephrasing to summarise and validate student contributions.",
  "Complete the structured 3-step reflection before closing.",
  "Tighten transitions between discussion and individual work.",
  "Manage time so the final activity is not rushed.",
  "Check in with students who did not participate during the session.",
];

const SESSION_SUMMARIES = [
  "The session covered the day's core topic with a check-in, a workbook activity and a group discussion before an individual goal-setting task.",
  "After a brief check-in, the facilitator introduced the topic, guided students through the workbook and facilitated a reflective group discussion.",
  "The facilitator opened with a warm check-in, delivered the main content and closed with a short reflection on what students had learned.",
];

const SESSION_FLOWS = [
  "The session flowed smoothly with clear transitions and steady engagement from most students.",
  "Flow was generally good, though engagement dipped during individual work and required occasional prompting.",
  "The session was somewhat uneven — strong discussion early on, but the closing felt rushed.",
];

const SAFETY_FLAG_TEMPLATES = [
  {
    type: "other",
    severity: "medium",
    description:
      "A student disclosed ongoing distress related to a recent loss; a co-facilitator offered follow-up support.",
  },
  {
    type: "self_harm",
    severity: "high",
    description:
      "A student alluded to thoughts of self-harm. The facilitator followed the escalation protocol and notified the supervisor.",
  },
  {
    type: "home_environment",
    severity: "low",
    description:
      "A student mentioned tension at home affecting concentration; noted for supervisor awareness.",
  },
];

const REFLECTIVE_QUESTIONS_POOL = [
  "What helped you decide when to move from group discussion to individual work?",
  "How did you notice and respond to the quieter students in the room?",
  "What would you keep the same, and what would you change, about how you opened the session?",
  "When the disclosure came up, what guided your response in the moment?",
  "How confident did you feel delivering the confidentiality agreement, and what would make it easier?",
];

const V2_COMPETENCIES = [
  "B1_active_listening",
  "B2_empathy_and_validation",
  "B3_protocol_delivery",
  "B4_group_facilitation",
  "B5_safety_and_risk_response",
];

const COMPETENCY_LEVELS = ["Emerging", "Developing", "Proficient", "Advanced"];
const CONFIDENCE_LEVELS = ["low", "medium", "high"];

function buildSafetyFlags() {
  return faker.datatype.boolean({ probability: 0.4 })
    ? [
        {
          ...faker.helpers.arrayElement(SAFETY_FLAG_TEMPLATES),
          requires_follow_up: faker.datatype.boolean({ probability: 0.7 }),
          timestamp_reference: `around the ${faker.number.int({ min: 2, max: 40 })}-minute mark`,
        },
      ]
    : [];
}

function buildFidelityFeedbackV1() {
  const questionScores = FIDELITY_QUESTIONS.map((question) => ({
    key: question.key,
    score: faker.number.int({ min: 1, max: 7 }),
    justification: faker.helpers.arrayElement(question.justifications),
  }));

  const average = questionScores.reduce((sum, q) => sum + q.score, 0) / questionScores.length;
  const overallScore = average.toFixed(1);

  const fidelityScores: Record<string, unknown> = {
    overall_score: overallScore,
    overall_assessment: faker.helpers.arrayElement(OVERALL_ASSESSMENTS),
  };
  for (const q of questionScores) {
    fidelityScores[q.key] = { score: q.score, justification: q.justification };
  }

  const feedback = {
    fidelity_scores: fidelityScores,
    recommendations: faker.helpers.arrayElements(RECOMMENDATIONS_POOL, { min: 2, max: 3 }),
    qualitative_feedback: {
      strengths: faker.helpers.arrayElements(STRENGTHS_POOL, { min: 2, max: 4 }),
      session_summary: faker.helpers.arrayElement(SESSION_SUMMARIES),
      areas_for_improvement: faker.helpers.arrayElements(IMPROVEMENTS_POOL, { min: 1, max: 3 }),
      session_flow_and_engagement: faker.helpers.arrayElement(SESSION_FLOWS),
    },
    safety_flags: buildSafetyFlags(),
  } as schema.JsonValue;

  return { feedback, overallScore, promptVersion: 1 };
}

function buildFidelityFeedbackV2() {
  const questionScores = FIDELITY_QUESTIONS.map((question) => ({
    key: question.key,
    score: faker.number.int({ min: 1, max: 7 }),
    justification: faker.helpers.arrayElement(question.justifications),
  }));

  const average = questionScores.reduce((sum, q) => sum + q.score, 0) / questionScores.length;
  const overallScore = average.toFixed(1);

  const fidelityScores: Record<string, unknown> = {
    overall_fidelity_score: overallScore,
    overall_fidelity_summary: faker.helpers.arrayElement(OVERALL_ASSESSMENTS),
  };
  for (const q of questionScores) {
    fidelityScores[q.key] = {
      score: `${q.score}/7`,
      justification: q.justification,
      open_closed_question_ratio: `${faker.number.int({ min: 1, max: 4 })}:${faker.number.int({ min: 1, max: 3 })}`,
    };
  }

  const selectedCompetencies = faker.helpers.arrayElements(V2_COMPETENCIES, {
    min: 3,
    max: V2_COMPETENCIES.length,
  });
  const competencyProfile: Record<string, unknown> = {};
  for (const key of selectedCompetencies) {
    competencyProfile[key] = {
      observed_behaviours: faker.lorem.sentence(),
      estimated_level: faker.helpers.arrayElement(COMPETENCY_LEVELS),
      level_framing: faker.lorem.sentence(),
      confidence: faker.helpers.arrayElement(CONFIDENCE_LEVELS),
      confidence_note: faker.lorem.sentence(),
    };
  }
  const anyCritical = faker.datatype.boolean({ probability: 0.15 });
  competencyProfile.red_flag_check = {
    any_critical_L1: anyCritical,
    flagged_domains: anyCritical
      ? faker.helpers.arrayElements(selectedCompetencies, { min: 1, max: 2 })
      : [],
    recommendation: anyCritical ? faker.helpers.arrayElement(RECOMMENDATIONS_POOL) : null,
  };

  const totalMinutes = faker.number.int({ min: 30, max: 50 });
  const fellowMinutes = faker.number.int({ min: 10, max: 25 });
  const studentMinutes = totalMinutes - fellowMinutes;
  const wellnessFlagged = faker.datatype.boolean({ probability: 0.2 });

  const feedback = {
    session_participation: {
      estimated_speakers: `${faker.number.int({ min: 6, max: 12 })}`,
      lead_fellow_speaking_time: `${fellowMinutes}m`,
      lead_fellow_speaking_percentage: `${Math.round((fellowMinutes / totalMinutes) * 100)}%`,
      total_student_speaking_time: `${studentMinutes}m`,
      participation_distribution: faker.lorem.sentence(),
      prosodic_observations: faker.lorem.sentence(),
    },
    fidelity_scores: fidelityScores,
    competency_profile: competencyProfile,
    supervision_preparation_brief: {
      strengths_to_acknowledge: faker.helpers
        .arrayElements(STRENGTHS_POOL, { min: 2, max: 3 })
        .map((strength) => ({
          strength,
          evidence: faker.lorem.sentence(),
          why_it_matters: faker.lorem.sentence(),
        })),
      areas_for_growth: faker.helpers
        .arrayElements(IMPROVEMENTS_POOL, { min: 1, max: 2 })
        .map((area) => ({
          area,
          what_was_observed: faker.lorem.sentence(),
          why_it_matters: faker.lorem.sentence(),
          suggested_supervision_activity: faker.helpers.arrayElement(RECOMMENDATIONS_POOL),
          supervision_protocol_section: `Section ${faker.number.int({ min: 1, max: 6 })}.${faker.number.int({ min: 1, max: 4 })}`,
        })),
      fellow_wellness_flag: {
        flagged: wellnessFlagged,
        observation: wellnessFlagged ? faker.lorem.sentence() : null,
        suggested_check_in: wellnessFlagged ? faker.lorem.sentence() : null,
      },
      reflective_questions_for_supervision: faker.helpers.arrayElements(REFLECTIVE_QUESTIONS_POOL, {
        min: 2,
        max: 3,
      }),
    },
    safety_flags: buildSafetyFlags(),
  } as schema.JsonValue;

  return { feedback, overallScore, promptVersion: 2 };
}

function buildFidelityFeedback() {
  return faker.datatype.boolean({ probability: 0.35 })
    ? buildFidelityFeedbackV2()
    : buildFidelityFeedbackV1();
}

async function createSessionRecordings(
  schools: DemoSchool[],
  sessionsBySchool: Map<string, DemoSessions>,
  seederUserId: string,
) {
  console.log("creating session recordings");

  const recordings: (typeof schema.sessionRecording.$inferInsert)[] = [];

  for (const school of schools) {
    if (!school.assignedSupervisorId) continue;

    const sessions = sessionsBySchool.get(school.id) ?? [];
    const groups = school.interventionGroups.slice(0, DEMO_GROUPS_PER_SCHOOL);

    for (const session of sessions) {
      for (const group of groups) {
        const recordingId = objectId("rec");
        const sessionType = session.sessionType ?? "session";
        const { feedback: fidelityFeedback, overallScore, promptVersion } = buildFidelityFeedback();

        // Synthetic key: looks real, points at no real object. The bucket is
        // resolved from env at runtime, so staging never touches prod audio.
        const s3Key = buildRecordingsS3Key({
          schoolName: school.schoolName,
          fellowName: group.leader.fellowName ?? "fellow",
          groupName: group.groupName,
          sessionType,
          recordingId,
          extension: "mp3",
        });

        const transcript = {
          segments: [
            { speaker: "fellow", text: faker.lorem.paragraph() },
            { speaker: "student", text: faker.lorem.sentence() },
          ],
        } as schema.JsonValue;

        recordings.push({
          id: recordingId,
          fileName: generateRecordingFilename(sessionType, recordingId, "mp3"),
          originalFileName: faker.system.commonFileName("mp3"),
          s3Key,
          contentType: "audio/mpeg",
          fileSize: faker.number.int({ min: 1_000_000, max: 30_000_000 }),
          fellowId: group.leaderId,
          schoolId: school.id,
          groupId: group.id,
          sessionId: session.id,
          uploadedBy: seederUserId,
          supervisorId: school.assignedSupervisorId,
          // COMPLETED so the /api/recordings/pending worker never picks these up
          // and nothing is ever submitted to the external Fidelity service.
          status: RecordingProcessingStatus.COMPLETED,
          processedAt: faker.date.recent({ days: 20 }),
          overallScore,
          promptVersion,
          fidelityFeedback,
          transcript,
        });
      }
    }
  }

  await insertMany(schema.sessionRecording, recordings);
}

async function createDemoRecords(
  allSchools: DemoSchool[],
  students: DemoStudents,
  sessions: DemoSessions,
) {
  const schools = allSchools.slice(0, DEMO_SCHOOL_SAMPLE);
  const schoolIds = new Set(schools.map((s) => s.id));

  const seeder = await db.query.user.findFirst({ columns: { id: true } });
  if (!seeder) {
    console.warn("No users found - skipping demo tracking/clinical/financial records");
    return;
  }
  const seederUserId = seeder.id;

  const studentsBySchool = new Map<string, DemoStudents>();
  for (const student of students) {
    if (!student.schoolId || !schoolIds.has(student.schoolId)) continue;
    const list = studentsBySchool.get(student.schoolId) ?? [];
    list.push(student);
    studentsBySchool.set(student.schoolId, list);
  }

  const sessionsBySchool = new Map<string, DemoSessions>();
  for (const session of sessions) {
    if (!session.schoolId || !schoolIds.has(session.schoolId)) continue;
    const list = sessionsBySchool.get(session.schoolId) ?? [];
    list.push(session);
    sessionsBySchool.set(session.schoolId, list);
  }

  const hubIdBySchoolId = new Map<string, string>();
  const groupLeaderByGroupId = new Map<string, string>();
  const groupTypeByGroupId = new Map<string, string>();
  for (const school of schools) {
    if (school.hubId) hubIdBySchoolId.set(school.id, school.hubId);
    for (const group of school.interventionGroups) {
      groupLeaderByGroupId.set(group.id, group.leaderId);
      groupTypeByGroupId.set(group.id, group.groupType);
    }
  }

  const { fellowAttendances } = await createAttendanceRecords(
    schools,
    studentsBySchool,
    sessionsBySchool,
    seederUserId,
  );
  await Promise.all([
    createHubAttendance(allSchools.slice(DEMO_SCHOOL_SAMPLE), sessions, seederUserId),
    createStudentOutcomes(schools, studentsBySchool, groupTypeByGroupId),
    createClinicalRecords(
      schools,
      studentsBySchool,
      sessionsBySchool,
      groupLeaderByGroupId,
      seederUserId,
    ),
    createPayoutRecords(fellowAttendances, hubIdBySchoolId, seederUserId),
    createSessionRecordings(schools, sessionsBySchool, seederUserId),
    createReportRecords(schools, sessionsBySchool, seederUserId),
  ]);
}

/**
 * Session ratings (school-reports/session): the school's supervisor rates every session that has
 * occurred. The supervisor and hub coordinator session reports list rated sessions only.
 */
async function createSessionRatings(schools: DemoSchool[], sessions: DemoSessions) {
  console.log("creating session ratings");
  const supervisorBySchoolId = new Map(
    schools.flatMap((school) =>
      school.assignedSupervisorId ? [[school.id, school.assignedSupervisorId] as const] : [],
    ),
  );
  const sessionRatings: (typeof schema.interventionSessionRating.$inferInsert)[] = [];
  for (const session of sessions) {
    const supervisorId = session.schoolId && supervisorBySchoolId.get(session.schoolId);
    if (!session.occurred || !supervisorId) continue;
    sessionRatings.push({
      id: objectId("isr"),
      sessionId: session.id,
      supervisorId,
      studentBehaviorRating: faker.number.int({ min: 1, max: 5 }),
      adminSupportRating: faker.number.int({ min: 1, max: 5 }),
      workloadRating: faker.number.int({ min: 1, max: 5 }),
      positiveHighlights: faker.lorem.sentence(),
      challenges: faker.lorem.sentence(),
      recommendations: faker.lorem.sentence(),
    });
  }
  await insertMany(schema.interventionSessionRating, sessionRatings);
}

async function createReportRecords(
  schools: DemoSchool[],
  sessionsBySchool: Map<string, DemoSessions>,
  seederUserId: string,
) {
  console.log("creating report records");

  const complaintReasons = [
    "Fellow arrived late to the session",
    "Fellow missed the supervision meeting",
    "Incomplete session documentation",
    "Fellow did not follow the session guide",
  ];

  const fellowComplaintData: (typeof schema.fellowComplaints.$inferInsert)[] = [];
  const groupEvaluationData: (typeof schema.interventionGroupReport.$inferInsert)[] = [];
  const fellowGroupReportData: (typeof schema.fellowGroupReport.$inferInsert)[] = [];

  for (const school of schools) {
    const sessions = sessionsBySchool.get(school.id) ?? [];
    const groups = school.interventionGroups.slice(0, DEMO_GROUPS_PER_SCHOOL);
    const projectId = school.hub?.projectId;

    groups.forEach((group, groupIndex) => {
      fellowComplaintData.push({
        complaint: faker.helpers.arrayElement(complaintReasons),
        comments: faker.lorem.sentence(),
        fellowId: group.leaderId,
        supervisorId: group.leader.supervisorId,
        createdBy: seederUserId,
      });

      if (projectId && groupIndex % 2 === 0) {
        fellowGroupReportData.push({
          id: objectId("fgr"),
          submittedAt: faker.date.recent({ days: 14 }),
          fellowId: group.leaderId,
          groupId: group.id,
          structuralFidelity: faker.number.int({ min: 1, max: 5 }),
          processFidelity: faker.number.int({ min: 1, max: 5 }),
          adaptationsMade: false,
          behavioralEngagement: faker.number.int({ min: 1, max: 5 }),
          reflectiveEngagement: faker.number.int({ min: 1, max: 5 }),
          psychologicalSafety: faker.number.int({ min: 1, max: 5 }),
          groupCohesion: faker.number.int({ min: 1, max: 5 }),
          climateConcerns: false,
          skillComprehension: faker.number.int({ min: 1, max: 5 }),
          inSessionTransfer: faker.number.int({ min: 1, max: 4 }),
          homePracticeApplicable: true,
          homePracticeEngagement: faker.number.int({ min: 1, max: 5 }),
          fellowGroupRelationship: faker.number.int({ min: 1, max: 5 }),
          externalDisruptions: false,
          facilitatorConfidence: faker.number.int({ min: 1, max: 5 }),
          hardestAspect: faker.lorem.sentence(),
          challengeImpact: faker.number.int({ min: 1, max: 5 }),
          whatWentWell: faker.lorem.sentence(),
          supportType: "SUFFICIENT",
        });
      }

      for (const session of sessions.slice(0, 2)) {
        groupEvaluationData.push({
          id: objectId("ige"),
          groupId: group.id,
          sessionId: session.id,
          engagement1: faker.number.int({ min: 1, max: 5 }),
          engagement2: faker.number.int({ min: 1, max: 5 }),
          engagement3: faker.number.int({ min: 1, max: 5 }),
          engagementComment: faker.lorem.sentence(),
          cooperation1: faker.number.int({ min: 1, max: 5 }),
          cooperation2: faker.number.int({ min: 1, max: 5 }),
          cooperation3: faker.number.int({ min: 1, max: 5 }),
          cooperationComment: faker.lorem.sentence(),
          content: faker.number.int({ min: 1, max: 5 }),
          contentComment: faker.lorem.sentence(),
        });
      }
    });
  }

  await Promise.all([
    insertMany(schema.fellowComplaints, fellowComplaintData),
    insertMany(schema.interventionGroupReport, groupEvaluationData),
    insertMany(schema.fellowGroupReport, fellowGroupReportData),
  ]);
}

async function main() {
  await truncateTables();

  const [projects, implementers] = await Promise.all([createProjects(), createImplementers()]);

  const userEmailSet = new Set<string>();

  const defaultProjectId = projects[0]?.id ?? "";
  const admins = await createAdminUsers(implementers, userEmailSet, defaultProjectId);
  const hubs = await createHubs(projects, implementers);
  const arsenal = hubs.find((hub) => hub.visibleId === arsenalHub.visibleId);
  if (!arsenal) throw new Error("The Arsenal hub was not created");
  const otherHubs = hubs.filter((hub) => hub !== arsenal);
  const hubCoordinators = await createHubCoordinators(arsenal, otherHubs, userEmailSet);
  const supervisors = await createSupervisors(arsenal, otherHubs, userEmailSet, 6);
  const clinicalLeads = await createClinicalLeads(arsenal, otherHubs, userEmailSet);
  const clinicalTeam = await createClinicalTeam(arsenal);
  await createResearchSurveys(defaultProjectId);
  const operations = await createOperations(arsenal, otherHubs, userEmailSet);
  const fellows = await createFellows(arsenal, supervisors, userEmailSet);

  await createTickets();

  await createCoreUsers(
    implementers,
    supervisors,
    hubCoordinators,
    fellows,
    clinicalLeads,
    operations,
    clinicalTeam,
    admins,
    hubs,
    defaultProjectId,
  );
  // One creation time for every seeded user, so a picker that orders by it and then by email picks
  // the same user after every reset, and users a test adds come after them.
  await db.update(schema.user).set({ createdAt: seedToday });

  const schools = await createSchools(hubs, arsenal, otherHubs, supervisors);
  await createInterventionGroups(schools, fellows);
  const schoolsWithGroupsAndFellows = await loadSchoolsWithGroupsAndHub();
  const students = await createStudentsForSchools(schoolsWithGroupsAndFellows);
  const { interventionSessionsNames } = await createSessionNames(hubs);

  const interventionSessions = await createInterventionSessionsForSchools(
    schoolsWithGroupsAndFellows,
    interventionSessionsNames,
  );

  await createSessionRatings(schoolsWithGroupsAndFellows, interventionSessions);

  await createDemoRecords(schoolsWithGroupsAndFellows, students, interventionSessions);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void pool.end());
