import { KENYAN_COUNTIES } from "#/lib/app-constants/constants";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { faker } from "@faker-js/faker";
import {
  Fellow,
  Hub,
  HubCoordinator,
  Implementer,
  ImplementerRole,
  Prisma,
  Project,
  SessionName,
  sessionTypes,
  Supervisor,
} from "@prisma/client";
import { isBefore, startOfMonth } from "date-fns";

// GETTING STARTED WITH SEEDING
// ===========================

// STEP 1: CORE SYSTEM SETUP
// ------------------------
// First, create the foundational data that other records will depend on

// 1.1 Create Files (Optional for all avatars)
// - Files are needed before creating any avatars
// - Required fields: id, key, fileName, byteSize, contentType
// - Example: Profile pictures, organization logos

// 1.2 Create Users (Core users of the system)
// - Create basic user profiles first
// - Required fields: id, name, email
// - Optional: Create UserAvatar (needs File record from 1.1)
// - Optional: Add some UserRecentOpen records to simulate usage
// - Required: if any staff member leaves the org then update the user creation script to prevent logins with shamiri emails

// 1.3 Create Implementers (Organizations running programs)
// - These are the parent organizations
// - Required fields: id, visibleId (e.g., "Imp_1"), implementerName, implementerType
// - Optional: Create ImplementerAvatar (needs File record from 1.1)
// - Remember: Implementers are the top-level organization entity

// STEP 2: PROJECT AND LOCATION SETUP
// ---------------------------------
// Now set up the project structure and physical locations

// 2.1 Create Projects
// - Projects organize implementation work
// - Required fields: id, visibleId, name
// - Link to Implementers using ProjectImplementer join table
// - Projects are required before creating Hubs

// 2.2 Create Hubs (Regional centers)
// - Hubs are geographical operation centers
// - Required fields: id, visibleId, hubName
// - Must be linked to: Project and Implementer
// - Hubs are required before creating schools or staff

// STEP 3: STAFF HIERARCHY
// ----------------------
// Create staff members in order of hierarchy

// 3.1 Create Hub Coordinators
// - They manage hubs and supervisors
// - Required fields: id, visibleId, coordinatorName
// - Must be linked to: Hub and Implementer
// - Create corresponding ImplementerMember with role HUB_COORDINATOR

// 3.2 Create Supervisors
// - They manage fellows and monitor schools
// - Required fields: id, visibleId, supervisorName
// - Must be linked to: Hub and Implementer
// - Create corresponding ImplementerMember with role SUPERVISOR

// 3.3 Create Fellows (Program delivery staff)
// - They lead intervention groups
// - Required fields: id, visibleId, fellowName
// - Must be linked to: Supervisor, Hub, and Implementer
// - Fellows need to exist before creating intervention groups

// STEP 4: LOCATION AND GROUP SETUP
// -------------------------------
// Set up physical locations and intervention groups

// 4.1 Create Schools
// - Schools are where interventions happen
// - Required fields: id, visibleId, schoolName
// - Must be linked to: Hub and Implementer (via SchoolImplementer)
// - Optional: Create SchoolDropoutHistory if needed

// 4.2 Create Intervention Groups
// - Groups are where students receive interventions
// - Required fields: id, groupName
// - Must be linked to: School, Fellow (as leader), and Project
// - Groups need to exist before adding students

// 4.3 Create Intervention Sessions
// - This is where the intervention is delivered
// - Must be linked to the school.

// STEP 5: PARTICIPANT MANAGEMENT
// ----------------------------
// Add program participants and their data

// 5.1 Create Students
// - They are the program participants
// - Required fields: id, visibleId, studentName
// - Must be linked to: School, Implementer, and InterventionGroup
// - Optional: Create StudentOutcome records for tracking progress

// STEP 6: TRACKING AND MONITORING
// -----------------------------
// Add attendance and monitoring records

// 6.1 Create Attendance Records
// - Create FellowAttendance
// - Create SupervisorAttendance
// - Create StudentAttendance
// All must be linked to appropriate InterventionSession

// 6.2 Create Evaluation Records
// - Create WeeklyFellowRatings
// - Create MonthlySupervisorEvaluation
// - Create InterventionGroupReport

// STEP 7: CLINICAL TRACKING (If needed)
// -----------------------------------
// Set up clinical case management

// 7.1 Create Clinical Records
// - Create ClinicalScreeningInfo for identified students
// - Add ClinicalSessionAttendance
// - Add ClinicalCaseTransferTrail if cases are transferred

// STEP 8: FINANCIAL RECORDS
// -----------------------
// Set up payment and reimbursement records

// 8.1 Create Payment Records
// - Create ReimbursementRequest
// - Create RepaymentRequest
// - Create PayoutReconciliation

// IMPORTANT TIPS
// =============
// 1. Always create parent records before child records
// 2. Check required fields in the schema
// 3. Maintain proper visible_id formats
// 4. Keep track of relationships between models
// 5. Use realistic dates for historical data
// 6. Include both active and archived records
// 7. Test edge cases (e.g., dropouts, transfers)

async function truncateTables() {
  console.log("Truncating tables");

  const excludedTables = ["_prisma_migrations"];

  const tables = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN (${excludedTables.map((table) => `'${table}'`).join(", ")});
  `;

  if (tables.length > 0) {
    const truncateCommand = `TRUNCATE TABLE ${tables.map((t) => `"${t.table_name}"`).join(", ")} CASCADE;`;
    await db.$executeRawUnsafe(truncateCommand);
    console.log("Selected tables truncated successfully.");
  } else {
    console.log(
      "No tables to truncate. Make sure to run `npm run db:dev:migrate` first.",
    );
  }
}

function generateImplementers(n: number) {
  const implmenters = [];
  for (let i = 0; i < n; i++) {
    implmenters.push({
      id: objectId("impl"),
      visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
      implementerName: faker.company.name(),
      implementerType: "NGO",
      implementerAddress: faker.location.secondaryAddress(),
      pointPersonName: faker.person.fullName(),
      pointPersonPhone: faker.phone.number({ style: "international" }),
      pointPersonEmail: faker.internet.email(),
      countyOfOperation: "Nairobi",
    });
  }

  return implmenters;
}

function createImplementers() {
  console.log("creating implementers");
  return db.implementer.createManyAndReturn({
    data: [
      {
        id: objectId("impl"),
        visibleId: "SHA",
        implementerName: "Shamiri Institute",
        implementerType: "NGO",
        implementerAddress:
          "13th Floor, Pioneer Point (CMS-Africa)\nChania Avenue, Nairobi, Kenya",
        pointPersonName: "Tom Osborn",
        pointPersonPhone: "+254 (0) 11 254 0760",
        pointPersonEmail: "team@shamiri.institute",
        countyOfOperation: "Nairobi",
      },
      ...generateImplementers(4),
    ],
  });
}

function createProjects() {
  console.log("creating projects");
  const projects = [];

  for (let i = 0; i < 4; i++) {
    projects.push({
      id: objectId("proj"),
      visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
      name: faker.company.name(),
      actualStartDate: startOfMonth(new Date()),
      actualEndDate: startOfMonth(new Date()),
    });
  }

  return db.project.createManyAndReturn({
    data: projects,
  });
}

function createProjectImplementers(
  projects: Project[],
  implementers: Implementer[],
) {
  console.log("creating project implementers");
  const projectImplementers = [];

  const minLength = Math.min(projects.length, implementers.length);

  for (let i = 0; i < minLength; i++) {
    projectImplementers.push({
      projectId: projects[i]?.id as string,
      implementerId: implementers[i]?.id as string,
    });
  }

  return db.projectImplementer.createManyAndReturn({
    data: projectImplementers,
  });
}

function createHubs(projects: Project[], implementers: Implementer[]) {
  console.log("creating hubs");
  const hubs = [];
  const minLength = Math.min(projects.length, implementers.length);

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

  return db.hub.createManyAndReturn({
    data: hubs,
  });
}

async function createCoreUsers(
  implementers: Implementer[],
  hubs: Hub[],
  supervisors: Supervisor[],
  hubCoordinators: HubCoordinator[],
  fellows: Fellow[],
) {
  console.log("creating core users");

  const userData = [
    {
      id: objectId("user"),
      email: "benny@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "shadrack.lilan@shamiri.institute",
      role: ImplementerRole.SUPERVISOR,
    },
    {
      id: objectId("user"),
      email: "wambugu.davis@shamiri.institute",
      role: ImplementerRole.FELLOW,
    },
    {
      id: objectId("user"),
      email: "stanley.george@shamiri.institute",
      role: ImplementerRole.SUPERVISOR,
    },
  ];

  const users = await db.user.createManyAndReturn({
    data: userData.map(({ id, email }) => ({
      id,
      email,
    })),
  });

  const membershipData = users.map((user) => {
    const role = userData.find((u) => u.id === user.id)
      ?.role as ImplementerRole;
    return {
      userId: user.id,
      implementerId: faker.helpers.arrayElement(implementers).id,
      role,
      identifier:
        role === "HUB_COORDINATOR"
          ? faker.helpers.arrayElement(hubCoordinators).id
          : role === "SUPERVISOR"
            ? faker.helpers.arrayElement(supervisors).id
            : role === "FELLOW"
              ? faker.helpers.arrayElement(fellows).id
              : null,
    };
  });

  await db.implementerMember.createMany({
    data: membershipData,
  });

  const county = faker.helpers.arrayElement(KENYAN_COUNTIES);
  const subCounty = faker.helpers.arrayElement(county.sub_counties);

  const supervisorRecords = userData
    .filter((user) => user.role === "SUPERVISOR")
    .map((user) => {
      return {
        id: objectId("supervisor"),
        implementerId: faker.helpers.arrayElement(implementers).id,
        visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
        supervisorName: faker.person.fullName(),
        supervisorEmail: faker.internet.email(),
        county: county.name,
        subCounty: subCounty,
        bankName: faker.company.name(),
        bankBranch: faker.location.county(),
        bankAccountNumber: faker.finance.accountNumber(),
        bankAccountName: faker.person.fullName(),
        kra: faker.finance.accountNumber(),
        nhif: faker.finance.accountNumber(),
        dateOfBirth: faker.date.birthdate(),
        cellNumber: faker.phone.number({ style: "international" }),
        mpesaNumber: faker.phone.number({ style: "international" }),
        gender: faker.person.sex(),
        idNumber: faker.string.alpha({ casing: "upper", length: 8 }),
        hubId: faker.helpers.arrayElement(hubs).id,
      };
    });

  const hubCoordinatorRecords = userData
    .filter((user) => user.role === "HUB_COORDINATOR")
    .map((user) => {
      return {
        id: objectId("hubcoordinator"),
        implementerId: faker.helpers.arrayElement(implementers).id,
        visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
        coordinatorName: faker.person.fullName(),
        coordinatorEmail: user.email,
        county: county.name,
        subCounty: subCounty,
        bankName: faker.company.name(),
        bankBranch: faker.location.county(),
        bankAccountNumber: faker.finance.accountNumber(),
        bankAccountName: faker.person.fullName(),
        kra: faker.finance.accountNumber(),
        nhif: faker.finance.accountNumber(),
        dateOfBirth: faker.date.birthdate(),
        cellNumber: faker.phone.number({ style: "international" }),
        mpesaNumber: faker.phone.number({ style: "international" }),
        gender: faker.person.sex(),
        idNumber: faker.string.alpha({ casing: "upper", length: 8 }),
        assignedHubId: faker.helpers.arrayElement(hubs).id,
      };
    });

  return Promise.all([
    db.hubCoordinator.createManyAndReturn({
      data: hubCoordinatorRecords,
    }),
    db.supervisor.createManyAndReturn({
      data: supervisorRecords,
    }),
  ]);
}

async function createHubCoordinators(hubs: Hub[], implementers: Implementer[]) {
  console.log("creating hub coordinators");
  const hubCoordinators = [];

  for (let i = 0; i < hubs.length; i++) {
    hubCoordinators.push({
      id: objectId("user"),
      email: faker.internet.email(),
      role: ImplementerRole.HUB_COORDINATOR,
    });
  }

  const createHubCoordinators = await db.user.createManyAndReturn({
    data: hubCoordinators.map(({ id, email }) => ({
      id,
      email,
    })),
  });

  const membershipData = createHubCoordinators.map((user) => ({
    userId: user.id,
    implementerId: faker.helpers.arrayElement(implementers).id,
    role: ImplementerRole.HUB_COORDINATOR,
    identifier: objectId("hubcoordinator"),
  }));

  await db.implementerMember.createMany({
    data: membershipData,
  });

  const hubCoordinatorRecords = hubCoordinators.map((_user) => {
    const county = faker.helpers.arrayElement(KENYAN_COUNTIES);
    const subCounty = faker.helpers.arrayElement(county.sub_counties);
    const gender = faker.person.sexType();

    return {
      id: membershipData.find((x) => x.userId === _user.id)?.identifier!,
      implementerId: faker.helpers.arrayElement(implementers).id,
      visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
      coordinatorName: faker.person.fullName(),
      coordinatorEmail: faker.internet.email(),
      county: county.name,
      subCounty: subCounty,
      bankName: faker.company.name(),
      bankBranch: faker.location.county(),
      bankAccountNumber: faker.finance.accountNumber(),
      bankAccountName: faker.person.fullName(),
      kra: faker.finance.accountNumber(),
      nhif: faker.finance.accountNumber(),
      dateOfBirth: faker.date.birthdate(),
      cellNumber: faker.phone.number({ style: "international" }),
      mpesaNumber: faker.phone.number({ style: "international" }),
      gender:
        Math.random() > 0.9
          ? "Other"
          : gender[0]?.toUpperCase() + gender.substring(1),
      idNumber: faker.string.numeric({ length: 8 }),
      assignedHubId: faker.helpers.arrayElement(hubs).id,
    };
  });

  return db.hubCoordinator.createManyAndReturn({
    data: hubCoordinatorRecords,
  });
}

async function createSupervisors(
  hubs: Hub[],
  n = 6,
  implementers: Implementer[],
) {
  console.log("creating supervisors");

  const supervisors = hubs
    .map((hub) => {
      return Array.from(Array(n).keys()).map(() => ({
        id: objectId("user"),
        email: faker.internet.email(),
        role: ImplementerRole.SUPERVISOR,
        hubId: hub.id,
        implementerId: hub.implementerId,
      }));
    })
    .flat();

  const createSupervisors = await db.user.createManyAndReturn({
    data: supervisors.map(({ id, email }) => ({
      id,
      email,
    })),
  });

  const membershipData = createSupervisors.map((user) => ({
    userId: user.id,
    implementerId: supervisors.find((supervisor) => supervisor.id === user.id)
      ?.implementerId!,
    role: ImplementerRole.SUPERVISOR,
    identifier: objectId("supervisor"),
  }));

  await db.implementerMember.createMany({
    data: membershipData,
  });

  const supervisorRecords = supervisors.map((_user) => {
    const county = faker.helpers.arrayElement(KENYAN_COUNTIES);
    const subCounty = faker.helpers.arrayElement(county.sub_counties);
    const gender = faker.person.sexType();

    return {
      id: membershipData.find((x) => x.userId === _user.id)?.identifier!,
      implementerId: _user.implementerId,
      visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
      supervisorName: faker.person.fullName(),
      supervisorEmail: faker.internet.email(),
      county: county.name,
      subCounty: subCounty,
      bankName: faker.company.name(),
      bankBranch: faker.location.county(),
      bankAccountNumber: faker.finance.accountNumber(),
      bankAccountName: faker.person.fullName(),
      kra: faker.finance.accountNumber(),
      nhif: faker.finance.accountNumber(),
      dateOfBirth: faker.date.birthdate(),
      cellNumber: faker.phone.number({ style: "international" }),
      mpesaNumber: faker.phone.number({ style: "international" }),
      gender:
        Math.random() > 0.9
          ? "Other"
          : gender[0]?.toUpperCase() + gender.substring(1),
      idNumber: faker.string.numeric({ length: 8 }),
      hubId: _user.hubId,
    };
  });

  return db.supervisor.createManyAndReturn({
    data: supervisorRecords,
  });
}

async function createFellows(supervisors: Supervisor[]) {
  console.log("creating fellows");
  const fellows: Prisma.FellowCreateManyInput[] = [];
  const counties = KENYAN_COUNTIES.map((county) => {
    const { name, sub_counties } = county;
    return { name, sub_counties };
  });

  supervisors.forEach((supervisor) => {
    const numFellows = faker.number.int({ min: 10, max: 15 });
    const subCounties = counties.find(
      (county) => county.name === supervisor.county,
    )?.sub_counties;

    for (let i = 0; i < numFellows; i++) {
      const gender = faker.person.sexType();
      const fellowName = faker.person.fullName({ sex: gender });

      fellows.push({
        id: objectId("user"),
        visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
        fellowName,
        fellowEmail: faker.internet.email().toLowerCase(),
        mpesaName: Math.random() > 0.5 ? fellowName : faker.person.fullName(),
        // NOTE: if we ever need to make this real, we would have to control the formatting
        mpesaNumber: faker.phone.number({ style: "international" }),
        // TODO: should we allow some fellows to have no supervisor?
        supervisorId: supervisor.id,
        hubId: supervisor.hubId,
        implementerId: supervisor.implementerId,
        county: supervisor.county,
        subCounty: subCounties
          ? faker.helpers.arrayElement(subCounties)
          : supervisor.subCounty,
        dateOfBirth: faker.date.birthdate(),
        cellNumber: faker.phone.number({ style: "international" }),
        gender:
          Math.random() > 0.9
            ? "Other"
            : gender[0]?.toUpperCase() + gender.substring(1),
        idNumber: faker.string.numeric({ length: 8 }),
      });
    }
  });

  const createFellows = await db.user.createManyAndReturn({
    data: fellows.map(({ id, fellowEmail }) => ({
      id,
      email: fellowEmail,
    })),
  });

  const membershipData = createFellows.map((user) => ({
    userId: user.id,
    implementerId: fellows.find((fellow) => fellow.id === user.id)
      ?.implementerId!,
    role: ImplementerRole.FELLOW,
    identifier: objectId("fellow"),
  }));

  await db.implementerMember.createMany({
    data: membershipData,
  });

  return db.fellow.createManyAndReturn({
    data: fellows.map((fellow) => {
      const { id, ..._fellow } = fellow;
      return {
        id: membershipData.find((fellow) => fellow.userId === id)?.identifier!,
        ..._fellow,
      };
    }),
  });
}

// TODO: should each school have a unique supervisor?
async function createSchools(hubs: Hub[], supervisors: Supervisor[]) {
  console.log("creating schools");
  const schools: Prisma.SchoolCreateManyInput[] = [];

  hubs.forEach((hub) => {
    const hubSupervisors = supervisors.filter(
      (supervisor) => supervisor.hubId === hub.id,
    );
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
        schoolType: faker.helpers.arrayElement([
          "National",
          "County",
          "Subcounty",
        ]),
        schoolEmail: faker.internet.email(),
        schoolCounty: county.name,
        schoolSubCounty: subCounty,
        schoolDemographics: faker.helpers.arrayElement([
          "Boys",
          "Girls",
          "Mixed",
        ]),
        pointPersonId: faker.string.alpha({ casing: "upper", length: 6 }),
        pointPersonName: faker.person.fullName(),
        pointPersonPhone: faker.phone.number({ style: "international" }),
        numbersExpected: faker.number.int({ min: 200, max: 600 }),
        principalName: faker.person.fullName(),
        droppedOut: false,
        dropoutReason: null,
        droppedOutAt: null,
        assignedSupervisorId: faker.helpers.arrayElement(supervisors).id,
      });
    }
  });

  return db.school.createManyAndReturn({
    data: schools,
    include: {
      hub: {
        include: {
          project: true,
          fellows: true,
        },
      },
    },
  });
}

type SchoolCreationResult = Awaited<ReturnType<typeof createSchools>>;

async function createInterventionGroups(
  schools: SchoolCreationResult,
  fellows: Fellow[],
) {
  console.log("creating intervention groups");
  const interventionGroups: Prisma.InterventionGroupCreateManyInput[] = [];
  const schoolFellowAssignments = new Map<string, Set<string>>(); // Maps schoolId -> Set<fellowId>
  const fellowSchoolCount = new Map<string, number>(); // Track how many schools each fellow is assigned to

  // Initialize fellowSchoolCount with all fellows
  for (const fellow of fellows) {
    fellowSchoolCount.set(fellow.id, 0);
  }

  for (const school of schools) {
    const numGroups = school.numbersExpected
      ? Math.ceil(school.numbersExpected / 16)
      : Math.ceil(1000 / 16);

    schoolFellowAssignments.set(school.id, new Set());

    for (let i = 0; i < numGroups; i++) {
      const availableFellows = fellows.filter(
        (fellow) =>
          fellow.hubId === school.hubId &&
          !schoolFellowAssignments.get(school.id)?.has(fellow.id),
      );

      if (!availableFellows.length) {
        console.warn(`No available fellows for school ${school.schoolName}.`);
        break;
      }

      // Sort fellows by how many schools they have been assigned to (ascending)
      const sortedFellows = availableFellows
        .map((fellow) => ({
          id: fellow.id,
          count: fellowSchoolCount.get(fellow.id) ?? 0,
        }))
        .sort((a, b) => a.count - b.count);

      const leader = sortedFellows[0]?.id; // Pick the fellow with the least assignments

      if (!leader) {
        console.warn(`No fellows assigned for school ${school.schoolName}`);
        continue;
      }

      // Assign the fellow to the school and update the tracking maps
      schoolFellowAssignments.get(school.id)?.add(leader);
      fellowSchoolCount.set(leader, (fellowSchoolCount.get(leader) ?? 0) + 1);

      interventionGroups.push({
        id: objectId("group"),
        groupName: faker.company.name(),
        schoolId: school.id,
        leaderId: leader,
        projectId: school.hub?.projectId as string,
      });
    }
  }

  return db.interventionGroup.createManyAndReturn({
    data: interventionGroups,
    include: {
      school: true,
    },
  });
}

async function createStudentsForSchools(
  schools: Prisma.SchoolGetPayload<{
    include: { interventionGroups: { include: { leader: true } } };
  }>[],
) {
  console.log("creating students");
  const students: Prisma.StudentCreateManyInput[] = [];

  for (const school of schools) {
    const numStudents = faker.number.int({
      min: school.numbersExpected || 1000 - Math.ceil(Math.random() * 60),
      max: school.numbersExpected || 1000,
    });
    for (let i = 0; i < numStudents; i++) {
      // consider making the form + year of birth more realistic
      students.push({
        id: objectId("student"),
        visibleId: objectId("student"), // use short id?
        studentName: faker.person.fullName(),
        schoolId: school.id,
        assignedGroupId: faker.helpers.arrayElement(school.interventionGroups)
          .id,
        gender: faker.helpers.arrayElement(["Male", "Female"]),
        yearOfBirth: faker.date
          .birthdate({ mode: "age", min: 12, max: 20 })
          .getFullYear(),
      });
    }
  }

  return db.student.createManyAndReturn({
    data: students,
  });
}

async function createSessionNames(hubs: Hub[]) {
  console.log("creating session names");
  const sessionNamesRecords: Prisma.SessionNameCreateManyInput[] = [];
  const interventionSessionNames = ["s0", "s1", "s2", "s3", "s4"];
  const followUpSessionNames = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"];

  for (const hub of hubs) {
    for (const sessionName of interventionSessionNames) {
      sessionNamesRecords.push({
        id: objectId("sessionname"),
        sessionName,
        sessionType: sessionTypes.INTERVENTION,
        sessionLabel: sessionName,
        // TODO: ensure amount maps to the correct session type
        amount: faker.number.int({ min: 500, max: 1000 }),
        currency: "KES",
        hubId: hub.id,
      });
    }
  }

  for (const sessionName of followUpSessionNames) {
    sessionNamesRecords.push({
      id: objectId("sessionname"),
      sessionName,
      sessionType: sessionTypes.CLINICAL,
      sessionLabel: sessionName,
      amount: faker.number.int({ min: 500, max: 1000 }),
      currency: "KES",
      hubId: faker.helpers.arrayElement(hubs).id,
    });
  }

  const sessions = await db.sessionName.createManyAndReturn({
    data: sessionNamesRecords,
  });

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

async function createInterventionSessionsForSchools(
  schools: Prisma.SchoolGetPayload<{
    include: { interventionGroups: { include: { leader: true } }; hub: true };
  }>[],
  interventionSessionNames: SessionName[],
) {
  console.log("creating intervention sessions");
  const interventionSessions: Prisma.InterventionSessionCreateManyInput[] = [];
  const fellowSessionDates = new Map<string, Set<string>>(); // fellowId -> Set of dates (YYYY-MM-DD)

  // Sort session names by hubId and then by sessionName for lookup
  const hubIdSessionNameMapping = interventionSessionNames.reduce<
    Record<string, { sessionName: string; sessionId: string }[]>
  >((acc, sessionName) => {
    if (!acc[sessionName.hubId]) {
      acc[sessionName.hubId] = [
        { sessionId: sessionName.id, sessionName: sessionName.sessionName },
      ];
    } else {
      acc[sessionName.hubId]!.push({
        sessionId: sessionName.id,
        sessionName: sessionName.sessionName,
      });
    }
    return acc;
  }, {});

  const hubIdKeys = Object.keys(hubIdSessionNameMapping);
  for (let key of hubIdKeys) {
    // taking advantage of lexigraphic sorting due to the constant prefix
    hubIdSessionNameMapping[key] = hubIdSessionNameMapping[key]!.sort();
  }

  for (const school of schools) {
    // Skip if school has no hub
    if (!school.hubId) continue;

    // Filter session names for this school's hub
    const hubSessionNames = hubIdSessionNameMapping[school.hubId];

    // Skip if no session names found for this hub
    if (!hubSessionNames || hubSessionNames.length === 0) continue;

    // Get all fellows who lead groups in this school
    const fellowsInSchool = school.interventionGroups.map(
      (group) => group.leader,
    );
    const fellowIds = new Set(fellowsInSchool.map((f) => f.id));

    // Start from current date for this school
    let currentDate = startOfMonth(new Date());
    currentDate.setHours(9, 0, 0, 0); // Set to 9 AM

    for (const sessionName of hubSessionNames) {
      // Check if any fellow in this school has a session on this date
      while (
        Array.from(fellowIds).some((fellowId) => {
          const fellowDates = fellowSessionDates.get(fellowId);
          return fellowDates?.has(currentDate.toISOString().split("T")[0]!);
        })
      ) {
        // If conflict exists, move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Create session for this school
      interventionSessions.push({
        id: objectId("session"),
        sessionDate: new Date(currentDate),
        sessionEndTime: new Date(currentDate.getTime() + 3 * 60 * 60 * 1000), // 3 hours later
        status: "Scheduled",
        sessionType: sessionName.sessionName,
        sessionId: sessionName.sessionId,
        schoolId: school.id,
        occurred: isBefore(new Date(currentDate), new Date()),
        yearOfImplementation: new Date().getFullYear(),
        projectId: school.hub?.projectId || undefined,
      });

      // Record the date for all fellows in this school
      fellowsInSchool.forEach((fellow) => {
        if (!fellowSessionDates.has(fellow.id)) {
          fellowSessionDates.set(fellow.id, new Set());
        }
        fellowSessionDates
          .get(fellow.id)
          ?.add(currentDate.toISOString().split("T")[0]!);
      });

      // Move to next week for next session
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }

  return db.interventionSession.createMany({
    data: interventionSessions,
  });
}

// TODO: should we guarantee that all child records are created for each parent record?
//POSSIBLE PERFORMANCE WIN BY PARALLELISING SOME OF THESE QUERIES?
async function main() {
  await truncateTables();

  const [projects, implementers] = await Promise.all([
    createProjects(),
    createImplementers(),
  ]);

  await createProjectImplementers(projects, implementers);
  const hubs = await createHubs(projects, implementers);
  const hubCoordinators = await createHubCoordinators(hubs, implementers);
  const supervisors = await createSupervisors(hubs, 6, implementers);
  const fellows = await createFellows(supervisors);

  await createCoreUsers(
    implementers,
    hubs,
    supervisors,
    hubCoordinators,
    fellows,
  );

  const schools = await createSchools(hubs, supervisors);
  await createInterventionGroups(schools, fellows);
  const schoolsWithGroupsAndFellows = await db.school.findMany({
    include: {
      interventionGroups: {
        include: {
          leader: true,
        },
      },
      hub: true,
    },
  });
  const students = await createStudentsForSchools(schoolsWithGroupsAndFellows);
  const { interventionSessionsNames } = await createSessionNames(hubs);

  // TODO: question, should we also dynamically mark attendance for fellows in these sessions?
  const interventionSessions = await createInterventionSessionsForSchools(
    schoolsWithGroupsAndFellows,
    interventionSessionsNames,
  );

  // TODO:
  // create fellow attendance records
  // create student attendance records
  // create supervisor attendance records
  // create clinical records
  // create payouts
}

main();
