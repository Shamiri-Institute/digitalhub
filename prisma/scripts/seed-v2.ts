import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { faker } from "@faker-js/faker";
import { Implementer, ImplementerRole, Project } from "@prisma/client";

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
  const projects = [];

  for (let i = 0; i < 4; i++) {
    projects.push({
      id: objectId("proj"),
      visibleId: faker.string.alpha({ casing: "upper", length: 6 }),
      name: faker.company.name(),
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

async function createUsers(implementers: Implementer[]) {
  const userData = [
    {
      id: objectId("user"),
      email: "benny@shamiri.institute",
      role: ImplementerRole.SUPERVISOR,
      roleByVisibleId: "SPV24_S_01",
    },
    {
      id: objectId("user"),
      email: "shadrack.lilan@shamiri.institute",
      role: ImplementerRole.SUPERVISOR,
      roleByVisibleId: "SPV24_S_01",
    },
    {
      id: objectId("user"),
      email: "wambugu.davis@shamiri.institute",
      role: ImplementerRole.SUPERVISOR,
      roleByVisibleId: "SPV24_S_01",
    },
  ];

  const users = await db.user.createManyAndReturn({
    data: userData,
  });

  const membershipData = users.map((user) => ({
    userId: user.id,
    implementerId: faker.helpers.arrayElement(implementers).id,
    role: ImplementerRole.SUPERVISOR,
    identifier: faker.string.alpha({ casing: "upper", length: 6 }),
  }));

  const implementerMembers = await db.implementerMember.createManyAndReturn({
    data: membershipData,
  });

  return { users, implementerMembers };
}

async function main() {
  await truncateTables();

  const projects = await createProjects();
  const implementers = await createImplementers();
  const projectImplementers = await createProjectImplementers(
    projects,
    implementers,
  );
  const hubs = await createHubs(projects, implementers);
  const { users, implementerMembers } = await createUsers(implementers);
}

main();
