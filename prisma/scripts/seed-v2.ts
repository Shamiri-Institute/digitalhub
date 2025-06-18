import { KENYAN_COUNTIES } from "#/lib/app-constants/constants";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { hubSessionTypes } from "#/prisma/scripts/generate-session-names";
import { faker } from "@faker-js/faker";
import {
  ClinicalLead,
  ClinicalTeam,
  Fellow,
  Hub,
  HubCoordinator,
  Implementer,
  ImplementerRole,
  OpsUser,
  Prisma,
  Project,
  SessionName,
  sessionTypes,
  Supervisor,
} from "@prisma/client";
import { isBefore, startOfMonth } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";

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

// Set faker seed
// TODO: Set seed value as an ENV variable for e2e testing
faker.seed(7634912);

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
  const implementers = [];

  for (let i = 0; i < n; i++) {
    implementers.push({
      id: objectId("impl"),
      visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
      implementerName: faker.company.name(),
      implementerType: "NGO",
      implementerAddress: faker.location.secondaryAddress(),
      pointPersonName: faker.person.fullName(),
      pointPersonPhone: faker.helpers.fromRegExp("2547[1-9]{8}"),
      pointPersonEmail: faker.internet.email().toLowerCase(),
      countyOfOperation: "Nairobi",
    });
  }

  return implementers;
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

  // Add static hub first
  const staticHub = {
    id: objectId("hub"),
    visibleId: "ARSENAL1",
    hubName: "Arsenal Hub",
    projectId: projects[0]?.id as string,
    implementerId: implementers[0]?.id as string,
  };
  hubs.push(staticHub);

  // Continue with dynamic hubs
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
  clinicalLeads: ClinicalLead[],
  operations: OpsUser[],
  clinicalTeam: ClinicalTeam,
) {
  console.log("creating core users");
  const userData = [
    {
      id: objectId("user"),
      email: "benny@shamiri.institute",
      role: ImplementerRole.CLINICAL_TEAM,
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
      role: ImplementerRole.CLINICAL_LEAD,
    },
    {
      id: objectId("user"),
      email: "ichami.etyang@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "mmbone@shamiri.institute",
      role: ImplementerRole.SUPERVISOR,
    },
    {
      id: objectId("user"),
      email: "abdulghani.noor@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "kahuria@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "nickson.mugambi@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "okoth@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "marie.odhiambo@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "caitlin.bochere@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
    },
    {
      id: objectId("user"),
      email: "david.onywoki@shamiri.institute",
      role: ImplementerRole.HUB_COORDINATOR,
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
              : role === "CLINICAL_LEAD"
                ? faker.helpers.arrayElement(clinicalLeads).id
                : role === "OPERATIONS"
                  ? faker.helpers.arrayElement(operations).id
                  : role === "CLINICAL_TEAM"
                    ? clinicalTeam.id
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
        cellNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
        mpesaNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
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
        cellNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
        mpesaNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
        gender: faker.person.sexType(),
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

async function createHubCoordinators(
  hubs: Hub[],
  implementers: Implementer[],
  emails: Set<string>,
) {
  console.log("creating hub coordinators");
  const hubCoordinators = [];

  // Add two static hub coordinators for the static hub
  const staticHub = hubs[0];
  const staticCoordinators = [
    {
      id: objectId("hubcoordinator"),
      visibleId: "HC_ARTETA",
      coordinatorName: "Mikel Arteta",
      coordinatorEmail: "mikel.arteta@test.com",
      implementerId: staticHub!.implementerId,
      assignedHubId: staticHub!.id,
      county: "Nairobi",
      subCounty: "Westlands",
      bankName: "Arsenal Bank",
      bankBranch: "Emirates Branch",
      bankAccountNumber: "12345678",
      bankAccountName: "Mikel Arteta",
      kra: "A123456789B",
      nhif: "12345678",
      dateOfBirth: new Date(1982, 2, 26),
      cellNumber: "254712345678",
      mpesaNumber: "254712345678",
      gender: "Male",
      idNumber: "12345678",
    },
    {
      id: objectId("hubcoordinator"),
      visibleId: "HC_GASPAR",
      coordinatorName: "Edu Gaspar",
      coordinatorEmail: "edu.gaspar@test.com",
      implementerId: staticHub!.implementerId,
      assignedHubId: staticHub!.id,
      county: "Nairobi",
      subCounty: "Westlands",
      bankName: "Arsenal Bank",
      bankBranch: "Emirates Branch",
      bankAccountNumber: "23456789",
      bankAccountName: "Edu Gaspar",
      kra: "B234567890C",
      nhif: "23456789",
      dateOfBirth: new Date(1978, 6, 15),
      cellNumber: "254723456789",
      mpesaNumber: "254723456789",
      gender: "Male",
      idNumber: "23456789",
    },
  ];

  // Create users for static coordinators
  const staticUsers = staticCoordinators.map((coord) => ({
    id: objectId("user"),
    email: coord.coordinatorEmail,
  }));

  // Create users in database
  const createdUsers = await db.user.createMany({
    data: staticUsers,
  });

  // Create membership records for static coordinators
  const staticMembershipData = staticUsers.map((user, index) => ({
    userId: user.id,
    implementerId: staticHub!.implementerId,
    role: ImplementerRole.HUB_COORDINATOR,
    identifier: staticCoordinators[index]!.id,
  }));

  await db.implementerMember.createMany({
    data: staticMembershipData,
  });

  // Add static coordinators to database
  await db.hubCoordinator.createMany({
    data: staticCoordinators,
  });

  // Add static coordinator emails to set
  staticCoordinators.forEach((coord) => emails.add(coord.coordinatorEmail));

  // Continue with dynamic coordinators
  const hubsWithoutStatic = hubs.slice(1);
  for (const hub of hubsWithoutStatic) {
    let uniqueEmail = faker.internet.email().toLowerCase();
    while (emails.has(uniqueEmail)) {
      uniqueEmail = faker.internet.email().toLowerCase();
    }
    emails.add(uniqueEmail);

    const userId = objectId("user");
    const coordinatorId = objectId("hubcoordinator");

    // Create user
    await db.user.create({
      data: {
        id: userId,
        email: uniqueEmail,
      },
    });

    // Create membership
    await db.implementerMember.create({
      data: {
        userId,
        implementerId: hub.implementerId,
        role: ImplementerRole.HUB_COORDINATOR,
        identifier: coordinatorId,
      },
    });

    // Create hub coordinator
    const county = faker.helpers.arrayElement(KENYAN_COUNTIES);
    const subCounty = faker.helpers.arrayElement(county.sub_counties);
    const gender = faker.person.sexType();

    await db.hubCoordinator.create({
      data: {
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
        nhif: faker.finance.accountNumber(),
        dateOfBirth: faker.date.birthdate(),
        cellNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
        mpesaNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
        gender:
          Math.random() > 0.9
            ? "Other"
            : gender[0]?.toUpperCase() + gender.substring(1),
        idNumber: faker.string.numeric({ length: 8 }),
        assignedHubId: hub.id,
      },
    });
  }

  return db.hubCoordinator.findMany();
}

async function createSupervisors(
  hubs: Hub[],
  n = 6,
  implementers: Implementer[],
  emails: Set<string>,
) {
  console.log("creating supervisors");
  const supervisors: Prisma.SupervisorCreateManyInput[] = [];

  // Add three static supervisors for the static hub
  const staticHub = hubs[0];
  const staticSupervisors = [
    {
      id: objectId("supervisor"),
      visibleId: "SUPERVISOR1",
      supervisorName: "Martin Ødegaard",
      supervisorEmail: "martin.odegaard@test.com",
      hubId: staticHub!.id,
      implementerId: staticHub!.implementerId,
      county: "Nairobi",
      subCounty: "Westlands",
      bankName: "Arsenal Bank",
      bankBranch: "Emirates Branch",
      bankAccountNumber: "12345678",
      bankAccountName: "Martin Ødegaard",
      kra: "A123456789B",
      nhif: "12345678",
      dateOfBirth: new Date(1998, 11, 17),
      cellNumber: "254712345678",
      mpesaNumber: "254712345678",
      gender: "Male",
      idNumber: "12345678",
    },
    {
      id: objectId("supervisor"),
      visibleId: "SUPERVISOR2",
      supervisorName: "Declan Rice",
      supervisorEmail: "declan.rice@test.com",
      hubId: staticHub!.id,
      implementerId: staticHub!.implementerId,
      county: "Nairobi",
      subCounty: "Westlands",
      bankName: "Arsenal Bank",
      bankBranch: "Emirates Branch",
      bankAccountNumber: "23456789",
      bankAccountName: "Declan Rice",
      kra: "B234567890C",
      nhif: "23456789",
      dateOfBirth: new Date(1999, 0, 14),
      cellNumber: "254723456789",
      mpesaNumber: "254723456789",
      gender: "Male",
      idNumber: "23456789",
    },
    {
      id: objectId("supervisor"),
      visibleId: "SUPERVISOR3",
      supervisorName: "William Saliba",
      supervisorEmail: "william.saliba@test.com",
      hubId: staticHub!.id,
      implementerId: staticHub!.implementerId,
      county: "Nairobi",
      subCounty: "Westlands",
      bankName: "Arsenal Bank",
      bankBranch: "Emirates Branch",
      bankAccountNumber: "34567890",
      bankAccountName: "William Saliba",
      kra: "C345678901D",
      nhif: "34567890",
      dateOfBirth: new Date(2001, 2, 24),
      cellNumber: "254734567890",
      mpesaNumber: "254734567890",
      gender: "Male",
      idNumber: "34567890",
    },
  ];

  supervisors.push(...staticSupervisors);
  staticSupervisors.forEach((sup) => emails.add(sup.supervisorEmail));

  // Continue with dynamic supervisors
  const hubsWithoutStatic = hubs.slice(1);
  const dynamicSupervisors = hubsWithoutStatic
    .map((hub) => {
      return Array.from(Array(n).keys()).map(() => {
        let uniqueEmail = faker.internet.email().toLowerCase();
        while (emails.has(uniqueEmail)) {
          uniqueEmail = faker.internet.email().toLowerCase();
        }
        emails.add(uniqueEmail);

        return {
          id: objectId("user"),
          email: uniqueEmail,
          role: ImplementerRole.SUPERVISOR,
          hubId: hub.id,
          implementerId: hub.implementerId,
          visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
        };
      });
    })
    .flat();

  supervisors.push(...dynamicSupervisors);

  const createSupervisors = await db.user.createManyAndReturn({
    data: supervisors.map(({ id, supervisorEmail }) => ({
      id,
      email: supervisorEmail,
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
    // Check if this is a static supervisor
    const isStaticSupervisor = _user.visibleId?.startsWith("SUPERVISOR");
    if (isStaticSupervisor) {
      // Return the static supervisor data as-is
      const { id: _id, ...rest } = _user;
      return {
        id: membershipData.find((x) => x.userId === _user.id)?.identifier!,
        ...rest,
      };
    }

    // For dynamic supervisors, generate random data
    const county = faker.helpers.arrayElement(KENYAN_COUNTIES);
    const subCounty = faker.helpers.arrayElement(county.sub_counties);
    const gender = faker.person.sexType();

    return {
      id: membershipData.find((x) => x.userId === _user.id)?.identifier!,
      implementerId: _user.implementerId,
      visibleId:
        _user.visibleId || faker.string.alpha({ casing: "upper", length: 6 }),
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
      cellNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
      mpesaNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
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

async function createOperations(hubs: Hub[], emails: Set<string>) {
  console.log("creating operations users");
  const operations: Prisma.OpsUserCreateManyInput[] = [];

  // Add static operations user for static hub
  const staticHub = hubs[0];
  const staticOps = {
    id: objectId("user"),
    email: "kai.havertz@test.com",
    implementerId: staticHub!.implementerId,
    name: "Kai Havertz",
    cellPhone: "254712345678",
  };
  operations.push(staticOps);
  emails.add(staticOps.email);

  // Continue with dynamic operations users
  const selectedHubs = hubs.slice(1);

  for (const hub of selectedHubs) {
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
      cellPhone: faker.helpers.fromRegExp("2547[1-9]{8}"),
    };

    operations.push(opsUser);
  }

  const createdOperations = await db.user.createManyAndReturn({
    data: operations.map(({ id, email }) => ({
      id,
      email,
    })),
  });

  const membershipData = createdOperations.map((ops) => ({
    userId: ops.id,
    implementerId: operations.find((x) => x.id === ops.id)?.implementerId!,
    role: ImplementerRole.OPERATIONS,
    identifier: objectId("opsuser"),
  }));

  await db.implementerMember.createMany({
    data: membershipData,
  });

  return db.opsUser.createManyAndReturn({
    data: operations.map((ops) => ({
      id: membershipData.find((x) => x.userId === ops.id)?.identifier!,
      ...ops,
    })),
  });
}

async function createClinicalLeads(hubs: Hub[], emails: Set<string>) {
  console.log("creating clinical leads");
  const clinicalLeads: Prisma.ClinicalLeadCreateManyInput[] = [];

  // Add static clinical lead for static hub
  const staticHub = hubs[0];
  const staticClinicalLead = {
    id: objectId("user"),
    clinicalLeadEmail: "ben.white@test.com",
    clinicalLeadName: "Ben White",
    implementerId: staticHub!.implementerId,
    assignedHubId: staticHub!.id,
  };
  clinicalLeads.push(staticClinicalLead);
  emails.add(staticClinicalLead.clinicalLeadEmail);

  // Continue with dynamic clinical leads
  for (const hub of hubs.slice(1)) {
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

  const createClinicalLeads = await db.user.createManyAndReturn({
    data: clinicalLeads.map(({ id, clinicalLeadEmail }) => ({
      id,
      email: clinicalLeadEmail,
    })),
  });

  const membershipData = createClinicalLeads.map((user) => ({
    userId: user.id,
    implementerId: clinicalLeads.find(
      (clinicalLead) => clinicalLead.id === user.id,
    )?.implementerId!,
    role: ImplementerRole.CLINICAL_LEAD,
    identifier: objectId("clinicallead"),
  }));

  await db.implementerMember.createMany({
    data: membershipData,
  });

  return db.clinicalLead.createManyAndReturn({
    data: clinicalLeads.map((clinicalLead) => ({
      id: membershipData.find((x) => x.userId === clinicalLead.id)?.identifier!,
      ...clinicalLead,
    })),
  });
}

async function createClinicalTeam(hubs: Hub[], implementers: Implementer[]) {
  console.log("creating clinical team");
  // Assign to Arsenal Hub (static hub) and same implementer
  const staticHub = hubs[0];
  const staticImplementer = implementers[0];
  if (!staticHub) throw new Error("No static hub found for clinical team");
  if (!staticImplementer)
    throw new Error("No static implementer found for clinical team");

  // Create user first
  const userId = objectId("user");
  const clinicalTeamId = objectId("clinicalteam");

  await db.user.create({
    data: {
      id: userId,
      email: "takehiro.tomiyasu@test.com",
    },
  });

  // Create implementer member with identifier
  await db.implementerMember.create({
    data: {
      userId,
      implementerId: staticImplementer.id,
      role: ImplementerRole.CLINICAL_TEAM,
      identifier: clinicalTeamId,
    },
  });

  // Create clinical team member with matching id
  const clinicalTeamMember = {
    id: clinicalTeamId,
    name: "Takehiro Tomiyasu",
    email: "takehiro.tomiyasu@test.com",
    cellNumber: "254712345679",
    assignedHubId: staticHub.id,
    implementerId: staticImplementer.id,
  };
  return db.clinicalTeam.create({ data: clinicalTeamMember });
}

async function createFellows(supervisors: Supervisor[], emails: Set<string>) {
  console.log("creating fellows");
  const fellows: Prisma.FellowCreateManyInput[] = [];

  // Add three static fellows for the static supervisors
  const staticSupervisors = supervisors.slice(0, 3);
  const staticFellows = [
    {
      id: objectId("user"),
      visibleId: "FELLOW1",
      fellowName: "Bukayo Saka",
      fellowEmail: "bukayo.saka@test.com",
      supervisorId: staticSupervisors[0]!.id,
      hubId: staticSupervisors[0]!.hubId,
      implementerId: staticSupervisors[0]!.implementerId,
      mpesaName: "Bukayo Saka",
      mpesaNumber: "254712345678",
      cellNumber: "254712345678",
      gender: "Male",
      dateOfBirth: new Date(2001, 8, 5),
      idNumber: "12345678",
      county: "Nairobi",
      subCounty: "Westlands",
    },
    {
      id: objectId("user"),
      visibleId: "FELLOW2",
      fellowName: "Gabriel Martinelli",
      fellowEmail: "gabriel.martinelli@test.com",
      supervisorId: staticSupervisors[1]!.id,
      hubId: staticSupervisors[1]!.hubId,
      implementerId: staticSupervisors[1]!.implementerId,
      mpesaName: "Gabriel Martinelli",
      mpesaNumber: "254723456789",
      cellNumber: "254723456789",
      gender: "Male",
      dateOfBirth: new Date(2001, 5, 18),
      idNumber: "23456789",
      county: "Nairobi",
      subCounty: "Westlands",
    },
    {
      id: objectId("user"),
      visibleId: "FELLOW3",
      fellowName: "Gabriel Jesus",
      fellowEmail: "gabriel.jesus@test.com",
      supervisorId: staticSupervisors[2]!.id,
      hubId: staticSupervisors[2]!.hubId,
      implementerId: staticSupervisors[2]!.implementerId,
      mpesaName: "Gabriel Jesus",
      mpesaNumber: "254734567890",
      cellNumber: "254734567890",
      gender: "Male",
      dateOfBirth: new Date(1997, 3, 3),
      idNumber: "34567890",
      county: "Nairobi",
      subCounty: "Westlands",
    },
  ];
  fellows.push(...staticFellows);
  staticFellows.forEach((fellow) => emails.add(fellow.fellowEmail));

  // Continue with dynamic fellows
  const counties = KENYAN_COUNTIES.map((county) => {
    const { name, sub_counties } = county;
    return { name, sub_counties };
  });

  for (const supervisor of supervisors.slice(3)) {
    const numFellows = faker.number.int({ min: 10, max: 15 });
    const subCounties = counties.find(
      (county) => county.name === supervisor.county,
    )?.sub_counties;

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
        mpesaName: Math.random() > 0.5 ? fellowName : faker.person.fullName(),
        // NOTE: if we ever need to make this real, we would have to control the formatting
        mpesaNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
        // TODO: should we allow some fellows to have no supervisor?
        supervisorId: supervisor.id,
        hubId: supervisor.hubId,
        implementerId: supervisor.implementerId,
        county: supervisor.county,
        subCounty: subCounties
          ? faker.helpers.arrayElement(subCounties)
          : supervisor.subCounty,
        dateOfBirth: faker.date.birthdate(),
        cellNumber: faker.helpers.fromRegExp("2547[1-9]{8}"),
        gender:
          Math.random() > 0.9
            ? "Other"
            : gender[0]?.toUpperCase() + gender.substring(1),
        idNumber: faker.string.numeric({ length: 8 }),
      });
    }
  }

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

  // Add static school for static hub
  const staticHub = hubs[0];
  schools.push(
    {
      id: objectId("sch"),
      visibleId: "ARSENAL_SCH",
      schoolName: "Emirates Academy",
      hubId: staticHub!.id,
      schoolType: "National",
      schoolEmail: "Gabriel.academy@test.com",
      schoolCounty: "Nairobi",
      schoolSubCounty: "Westlands",
      schoolDemographics: "Mixed",
      pointPersonId: "ARSENAL_PP",
      pointPersonName: "Thomas Partey",
      pointPersonPhone: "254700000000",
      numbersExpected: 300,
      principalName: "David Raya",
      droppedOut: false,
      dropoutReason: null,
      droppedOutAt: null,
      assignedSupervisorId: supervisors.find(
        (s) => s.visibleId === "SUPERVISOR1",
      )!.id,
    },
    {
      id: objectId("sch"),
      visibleId: "SOBHA_SCH",
      schoolName: "Sobha Academy",
      hubId: staticHub!.id,
      schoolType: "National",
      schoolEmail: "sobha.academy@test.com",
      schoolCounty: "Nairobi",
      schoolSubCounty: "Westlands",
      schoolDemographics: "Mixed",
      pointPersonId: "SOBHA_PP",
      pointPersonName: "Kai Havertz",
      pointPersonPhone: "254700000000",
      numbersExpected: 350,
      principalName: "Mikel Merino",
      droppedOut: false,
      dropoutReason: null,
      droppedOutAt: null,
      assignedSupervisorId: supervisors.find(
        (s) => s.visibleId === "SUPERVISOR2",
      )!.id,
    },
  );

  // Continue with dynamic schools
  hubs.slice(1).forEach((hub) => {
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
        pointPersonPhone: faker.helpers.fromRegExp("2547[1-9]{8}"),
        numbersExpected: faker.number.int({ min: 200, max: 600 }),
        principalName: faker.person.fullName(),
        droppedOut: false,
        dropoutReason: null,
        droppedOutAt: null,
        assignedSupervisorId: faker.helpers.arrayElement(hubSupervisors).id,
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

  // Add static intervention groups for static school
  const staticSchool = schools[0];
  const staticFellows = fellows.filter((f) =>
    f.visibleId?.startsWith("FELLOW"),
  );

  // Create one group for each static fellow
  staticFellows.forEach((fellow, index) => {
    interventionGroups.push({
      id: objectId("group"),
      groupName: `Group ${index + 1}`,
      schoolId: staticSchool!.id,
      leaderId: fellow.id,
      projectId: staticSchool!.hub?.projectId as string,
      groupType: Math.random() > 0.95 ? "TREATMENT" : "CONTROL",
    });
  });

  // Continue with dynamic intervention groups
  const schoolFellowAssignments = new Map<string, Set<string>>(); // Maps schoolId -> Set<fellowId>
  const fellowSchoolCount = new Map<string, number>(); // Track how many schools each fellow is assigned to

  // Initialize fellowSchoolCount with all fellows
  for (const fellow of fellows) {
    fellowSchoolCount.set(fellow.id, 0);
  }

  for (const school of schools.slice(1)) {
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
        groupType: "TREATMENT",
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

  // Add static students for static school
  const staticSchool = schools[0];
  const staticGroups = staticSchool!.interventionGroups;

  // Create 30 static students (10 for each group)
  staticGroups.forEach((group, groupIndex) => {
    for (let i = 0; i < 10; i++) {
      students.push({
        id: objectId("student"),
        visibleId: `STATIC_STU_${groupIndex + 1}_${i + 1}`,
        studentName: `Student ${groupIndex + 1}.${i + 1}`,
        admissionNumber: `ADM_${groupIndex + 1}_${i + 1}`,
        schoolId: staticSchool!.id,
        assignedGroupId: group.id,
        gender: i % 2 === 0 ? "Male" : "Female",
        yearOfBirth: 2008, // Fixed birth year for static students
      });
    }
  });

  // Continue with dynamic students for other schools
  for (const school of schools.slice(1)) {
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
        admissionNumber: faker.string.numeric({ length: 5 }),
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

  for (const hub of hubs) {
    // TODO: Modify to create sessionTypes per project per hub
    for (const sessionType of hubSessionTypes) {
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
  const fellowSessionDates = new Map<string, Set<string>>();

  // Create static sessions for static school
  const staticSchool = schools[0];
  const staticSessionNames = interventionSessionNames.filter(
    (sn) => sn.hubId === staticSchool!.hub?.id,
  );

  // Start from a fixed date for static sessions
  let staticDate = new Date();
  staticDate.setHours(16, 0, 0, 0); // Set to 4 PM today

  // Create a Set to track used session types for the static school
  const usedStaticSessionTypes = new Set<string>();

  for (const sessionName of staticSessionNames) {
    // Skip if we've already used this session type for this school
    if (usedStaticSessionTypes.has(sessionName.sessionName)) continue;
    usedStaticSessionTypes.add(sessionName.sessionName);

    interventionSessions.push({
      id: objectId("session"),
      sessionDate: zonedTimeToUtc(new Date(staticDate), "Africa/Nairobi"),
      status: "Scheduled",
      sessionType: sessionName.sessionName,
      sessionId: sessionName.id,
      schoolId: staticSchool!.id,
      occurred: isBefore(staticDate, new Date()),
      yearOfImplementation: 2024,
      projectId: staticSchool!.hub?.projectId || undefined,
      hubId: staticSchool!.hubId,
    });

    // Move to next week for next static session
    staticDate.setDate(staticDate.getDate() + 7);
  }

  // Continue with dynamic sessions for other schools
  for (const school of schools.slice(1)) {
    // Skip if school has no hub
    if (!school.hubId) continue;

    // Get session names for this school's hub
    const schoolSessionNames = interventionSessionNames.filter(
      (sn) => sn.hubId === school.hub?.id,
    );

    // Create a Set to track used session types for this school
    const usedSessionTypes = new Set<string>();

    // Get all fellows who lead groups in this school
    const fellowsInSchool = school.interventionGroups.map(
      (group) => group.leader,
    );
    const fellowIds = new Set(fellowsInSchool.map((f) => f.id));

    // Start from current date for this school
    let currentDate = startOfMonth(new Date());
    currentDate.setHours(9, 0, 0, 0); // Set to 9 AM

    for (const sessionName of schoolSessionNames) {
      // Skip if we've already used this session type for this school
      if (usedSessionTypes.has(sessionName.sessionName)) continue;
      usedSessionTypes.add(sessionName.sessionName);

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
        sessionDate: zonedTimeToUtc(new Date(currentDate), "Africa/Nairobi"),
        status: "Scheduled",
        sessionType: sessionName.sessionName,
        sessionId: sessionName.id,
        schoolId: school.id,
        occurred: isBefore(new Date(currentDate), new Date()),
        yearOfImplementation: new Date().getFullYear(),
        projectId: school.hub?.projectId || undefined,
        hubId: school.hubId,
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

  const userEmailSet = new Set<string>();

  const hubs = await createHubs(projects, implementers);
  const hubCoordinators = await createHubCoordinators(
    hubs,
    implementers,
    userEmailSet,
  );
  const supervisors = await createSupervisors(
    hubs,
    6,
    implementers,
    userEmailSet,
  );

  const clinicalLeads = await createClinicalLeads(hubs, userEmailSet);
  const clinicalTeam = await createClinicalTeam(hubs, implementers);
  const operations = await createOperations(hubs, userEmailSet);
  const fellows = await createFellows(supervisors, userEmailSet);

  await createCoreUsers(
    implementers,
    hubs,
    supervisors,
    hubCoordinators,
    fellows,
    clinicalLeads,
    operations,
    clinicalTeam,
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
