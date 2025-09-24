# Shamiri Digital Hub - Data Dictionary

## Executive Summary

The Shamiri Digital Hub is a comprehensive platform designed to manage educational mental health interventions across multiple schools in Kenya. The system tracks students, fellows (group leaders), supervisors, and clinical staff as they deliver and monitor mental health programs. This data dictionary provides a clear explanation of each database table and its purpose within the system.

## System Overview

The platform serves several key functions:
- **Educational Program Management**: Tracking intervention sessions, student attendance, and outcomes
- **Personnel Management**: Managing fellows, supervisors, hub coordinators, and clinical staff
- **Clinical Case Management**: Identifying and tracking students who need additional mental health support
- **Financial Management**: Processing payments to fellows and tracking expenses
- **Reporting & Analytics**: Generating insights on program effectiveness and operations

---

## 1. User & Authentication Tables

### User
**Purpose**: Core user account table that stores authentication and profile information for all system users.

**Business Context**: Every person who logs into the system has a User record. This includes supervisors, hub coordinators, fellows, clinical staff, and operations personnel.

**Key Fields**:
- `email`: User's login email address
- `name`: Display name
- `image`: Profile photo URL
- `emailVerified`: Confirms email ownership

**Relationships**: Central to the entire system - connects to member roles, attendance records, documents, and audit trails.

---

### Account
**Purpose**: Manages OAuth authentication providers (like Google login).

**Business Context**: Allows users to sign in using their Google accounts rather than managing separate passwords.

**Key Fields**:
- `provider`: Authentication service (e.g., "google")
- `providerAccountId`: User's ID from the provider
- `access_token`: OAuth tokens for API access

---

### Session
**Purpose**: Tracks active user login sessions for security.

**Business Context**: Manages who is currently logged in and ensures sessions expire appropriately.

---

### VerificationToken
**Purpose**: Handles email verification and password reset tokens.

**Business Context**: Ensures email addresses are valid and supports secure password recovery.

---

## 2. Organization & Personnel Tables

### Implementer
**Purpose**: Organizations that run the Shamiri programs (NGOs, schools, partners).

**Business Context**: Different organizations can use the platform to manage their own mental health programs. Each implementer has its own staff, schools, and students.

**Key Fields**:
- `visibleId`: Human-readable ID (e.g., "Imp_1")
- `implementerName`: Organization name
- `implementerType`: Category (e.g., "NGO")
- `countyOfOperation`: Geographic area of service

---

### ImplementerMember
**Purpose**: Links users to organizations with specific roles.

**Business Context**: Defines which organization a user belongs to and their role within it (supervisor, fellow, etc.).

**Key Fields**:
- `role`: User's position (ADMIN, SUPERVISOR, FELLOW, etc.)
- `identifier`: Role-specific ID (e.g., "sup_123" for supervisors)

---

### Fellow
**Purpose**: Lay providers who lead student intervention groups.

**Business Context**: Fellows are trained young adults who deliver mental health interventions to students. They are the primary facilitators of the Shamiri program.

**Key Fields**:
- `visibleId`: Unique fellow identifier
- `mpesaNumber`: Mobile money number for payments
- `supervisorId`: Who oversees this fellow
- `droppedOut`: Whether they've left the program

**Relationships**: Connected to students, attendance records, payments, and evaluations.

---

### Supervisor
**Purpose**: Experienced staff who oversee and support fellows.

**Business Context**: Supervisors train fellows, monitor session quality, handle clinical referrals, and ensure program fidelity. Each supervisor manages multiple fellows and schools.

**Key Fields**:
- `visibleId`: Unique supervisor identifier (e.g., "sup_001")
- `assignedSchools`: Schools under their supervision
- `bankAccountNumber`: For expense reimbursements
- `trainingLevel`: Their qualification level

---

### HubCoordinator
**Purpose**: Regional managers overseeing multiple schools and supervisors.

**Business Context**: Hub coordinators manage operations across a geographic area, coordinate with schools, and supervise the supervisor team.

**Key Fields**:
- `visibleId`: Unique coordinator ID (e.g., "23_HC_01")
- `assignedHubId`: Their operational region
- `bankAccountDetails`: For financial transactions

---

### ClinicalLead
**Purpose**: Mental health professionals managing clinical cases.

**Business Context**: Clinical leads handle students with serious mental health needs that require professional intervention beyond the standard program.

---

### ClinicalTeam
**Purpose**: Support staff for clinical operations.

**Business Context**: Assists clinical leads with case management and follow-up.

---

### OpsUser
**Purpose**: Administrative and operations staff.

**Business Context**: Backend support staff who manage data, reports, and system operations.

---

## 3. Educational Structure Tables

### School
**Purpose**: Educational institutions where programs are delivered.

**Business Context**: Each school hosts Shamiri intervention sessions. Schools have point persons who coordinate with the Shamiri team.

**Key Fields**:
- `visibleId`: School code (e.g., "T2PS_School_6")
- `schoolType`: Category of school
- `numbersExpected`: Expected student enrollment
- `pointPersonName/Email/Phone`: School contact person
- `droppedOut`: Whether school discontinued the program

---

### Student
**Purpose**: Youth participants in the mental health interventions.

**Business Context**: Students receive group-based mental health support. The system tracks their demographics, attendance, and mental health outcomes.

**Key Fields**:
- `visibleId`: Unique student ID
- `admissionNumber`: School's student ID
- `age/yearOfBirth`: Age tracking
- `form/stream`: Grade level and class
- `isClinicalCase`: Needs additional clinical support
- `droppedOut`: Left the program

**Sensitive Data**: Contains personal information requiring privacy protection.

---

### InterventionGroup
**Purpose**: Small groups of students led by a fellow.

**Business Context**: Students are divided into groups of 10-15 for intervention sessions. Each group has a consistent fellow leader.

**Key Fields**:
- `groupName`: Identifier for the group
- `leaderId`: Fellow who leads this group
- `groupType`: TREATMENT or CONTROL (for research)

---

### InterventionSession
**Purpose**: Scheduled program sessions at schools.

**Business Context**: Represents when a mental health session occurs. Sessions follow a structured curriculum (Session 0, 1, 2, 3, 4, plus follow-ups).

**Key Fields**:
- `sessionDate`: When the session happens
- `sessionType`: Category (s0, s1, s2, s3, s4, fu1-fu8)
- `occurred`: Whether session actually happened
- `status`: Scheduled/Rescheduled/Cancelled

---

### StudentAttendance
**Purpose**: Tracks which students attended which sessions.

**Business Context**: Critical for monitoring program engagement and making payments to fellows.

**Key Fields**:
- `attended`: Present or absent
- `absenceReason`: Why student missed session
- `markedBy`: Who recorded attendance

---

### FellowAttendance
**Purpose**: Tracks fellow presence at sessions.

**Business Context**: Fellows are paid based on session attendance. This table drives the payment system.

**Key Fields**:
- `attended`: Whether fellow showed up
- `paymentInitiated`: Payment processing status
- `processedAt`: When attendance was verified

---

### SupervisorAttendance
**Purpose**: Records supervisor session visits.

**Business Context**: Supervisors periodically observe sessions for quality assurance.

---

## 4. Clinical Management Tables

### ClinicalScreeningInfo
**Purpose**: Identifies and tracks students needing clinical intervention.

**Business Context**: Some students have mental health needs beyond what group sessions can address. This table manages their clinical care pathway.

**Key Fields**:
- `caseStatus`: Active/Terminated/FollowUp/Referred
- `riskStatus`: No/Low/Medium/High risk level
- `generalPresentingIssues`: Mental health concerns
- `flagged`: Requires urgent attention
- `pseudonym`: Protects student identity in reports

---

### ClinicalSessionAttendance
**Purpose**: Tracks individual clinical sessions with students.

**Business Context**: Documents when clinical cases receive one-on-one support.

---

### ClinicalCaseNotes
**Purpose**: Clinical documentation for each session.

**Business Context**: Professional notes about student progress, interventions used, and treatment plans.

**Key Fields**:
- `presentingIssues`: Current concerns
- `orsAssessment`: Outcome rating scale score
- `treatmentInterventions`: Methods used
- `followUpPlan`: Next steps

---

### ClinicalFollowUpTreatmentPlan
**Purpose**: Structured treatment plans for clinical cases.

**Business Context**: Documents the therapeutic approach and expected timeline for clinical interventions.

---

### ClinicalCaseTermination
**Purpose**: Records why and when clinical cases close.

**Business Context**: Documents successful completions, referrals to other services, or other reasons for ending clinical support.

---

## 5. Financial & Payment Tables

### PayoutStatements
**Purpose**: Records all payments made to fellows.

**Business Context**: Fellows receive payments for each session they conduct. This table provides an audit trail of all payments.

**Key Fields**:
- `amount`: Payment amount
- `reason`: Payment type (attendance, delayed, special)
- `executedAt`: When payment was sent
- `mpesaNumber`: Mobile money recipient

---

### RepaymentRequest
**Purpose**: Handles payment disputes and corrections.

**Business Context**: When fellows report missing or incorrect payments, supervisors can request corrections.

---

### PayoutReconciliation
**Purpose**: Adjusts fellow payments for overpayments or corrections.

**Business Context**: Ensures payment accuracy by tracking adjustments needed in future payouts.

---

### ReimbursementRequest
**Purpose**: Expense claims by supervisors and coordinators.

**Business Context**: Staff can claim legitimate expenses like travel or materials.

**Key Fields**:
- `kind`: Expense type (travel, internet, airtime)
- `status`: Approval status
- `details`: Supporting documentation

---

### SpecialApprovalRequests
**Purpose**: Non-standard payment approvals.

**Business Context**: Handles exceptional payment situations requiring coordinator approval.

---

### FellowPaymentComplaints
**Purpose**: Formal payment dispute tracking.

**Business Context**: Provides a structured way for fellows to report payment issues.

---

## 6. Reporting & Monitoring Tables

### StudentOutcome
**Purpose**: Mental health assessment scores over time.

**Business Context**: Tracks student mental health changes using validated questionnaires (PHQ, GAD, etc.) at multiple time points.

**Key Fields**:
- `timePoint`: Assessment phase (baseline, midline, endline)
- `phq1-8`: Depression scores
- `gad1-7`: Anxiety scores
- Multiple other validated scales

---

### WeeklyHubReport
**Purpose**: Regional operational reports.

**Business Context**: Hub coordinators submit weekly updates on program operations, challenges, and successes.

---

### WeeklyTeamMeetingReport
**Purpose**: Team coordination meeting notes.

**Business Context**: Documents decisions and issues from regional team meetings.

---

### SessionComment
**Purpose**: Notes and observations about sessions.

**Business Context**: Allows staff to document important session events or concerns.

---

### InterventionSessionRating
**Purpose**: Quality ratings of sessions by supervisors.

**Business Context**: Supervisors rate student engagement, administrative support, and session quality.

---

### WeeklyFellowRatings
**Purpose**: Performance evaluations of fellows.

**Business Context**: Supervisors regularly assess fellow performance across multiple dimensions.

---

### MonthlySupervisorEvaluation
**Purpose**: Hub coordinator assessment of supervisors.

**Business Context**: Ensures supervisor quality through regular performance reviews.

---

## 7. Supporting Tables

### File
**Purpose**: Manages uploaded documents and images.

**Business Context**: Stores profile photos, documentation, and report attachments.

---

### Project
**Purpose**: Defines funded program phases.

**Business Context**: Different funders support different program phases. This tracks which activities belong to which funding source.

---

### Hub
**Purpose**: Geographic operational regions.

**Business Context**: Organizes schools and staff by geographic area for efficient management.

---

### SessionName
**Purpose**: Defines session types and payment rates.

**Business Context**: Different session types (training, intervention, clinical) have different payment amounts.

---

### Various Document Tables
- **SchoolDocuments**: School-related files
- **FellowDocuments**: Fellow credentials and records
- **StudentReportingNotes**: Supervisor observations about students
- **FellowReportingNotes**: Supervisor notes about fellows

---

## Data Privacy & Security Notes

1. **Personal Information**: Student, fellow, and staff tables contain sensitive personal data requiring protection.

2. **Financial Data**: Payment and banking information requires secure handling.

3. **Clinical Data**: Mental health information is highly sensitive and may be subject to healthcare privacy regulations.

4. **Visible IDs**: The system uses prefixed IDs (e.g., "sup_123") instead of exposing database IDs for security and readability.

---

## Key Business Processes Supported

1. **Program Delivery**: Scheduling sessions → Taking attendance → Recording outcomes
2. **Payment Processing**: Session attendance → Payment calculation → Payment execution → Complaint resolution
3. **Clinical Referrals**: Screening → Case creation → Treatment planning → Progress tracking
4. **Quality Assurance**: Session observation → Performance rating → Feedback → Improvement
5. **Reporting**: Data collection → Aggregation → Analysis → Decision making

This data dictionary serves as a living document and should be updated as the system evolves to support new features and requirements.