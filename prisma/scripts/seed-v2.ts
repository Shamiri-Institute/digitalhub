import { db } from "#/lib/db";
import { objectId } from "#/lib/crypto";

// GETTING STARTED WITH SEEDING
// ===========================

// STEP 1: CORE SYSTEM SETUP
// ------------------------
// First, create the foundational data that other records will depend on

// 1.1 Create Files (Required for all avatars)
// - Files are needed before creating any avatars
// - Required fields: id, key, fileName, byteSize, contentType
// - Example: Profile pictures, organization logos

// 1.2 Create Users (Core users of the system)
// - Create basic user profiles first
// - Required fields: id, name, email
// - Optional: Create UserAvatar (needs File record from 1.1)
// - Optional: Add some UserRecentOpen records to simulate usage

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
