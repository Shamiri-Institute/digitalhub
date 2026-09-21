# Data access layer: improvement notes from the Drizzle migration

Collected while converting queries for ENG-2137. None of these were done during the migration,
because each conversion PR must return identical data. They are candidates for follow-up tickets,
grouped by theme, each with the file that shows it.

## What Prisma did implicitly, and what replaced it

Each row is a behaviour Prisma provided without the code saying so. Drizzle's bare operations
exposed it; the conversion PRs made it explicit. "Keep" means the replacement is permanent,
"temporary" means it goes away with ENG-2161 or the Drizzle 1.0 upgrade.

| Prisma behaviour                                                                  | How it surfaced                                                                                                             | Replacement                                                                                                     | Status                                               |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `@default(cuid())` generated ids in the client                                    | 43 tables have no database default for `id`                                                                                 | `.$defaultFn(() => randomUUID())` in `db/schema.ts`; new rows get UUIDs                                         | keep                                                 |
| `@updatedAt` set on every write                                                   | no database default or trigger                                                                                              | `.$defaultFn(now).$onUpdate(now)`; does not fire on `onConflictDoUpdate`, so upserts set `updatedAt` explicitly | keep                                                 |
| Nested writes (`update` with a relation `update`/`create`) ran as one transaction | two statements in Drizzle                                                                                                   | explicit `db.transaction`                                                                                       | keep                                                 |
| `update`/`delete`/`findUniqueOrThrow` threw when no row matched                   | Drizzle returns zero rows                                                                                                   | `.returning()` length checks with explicit throws (many sites)                                                  | keep; no helper, the explicit checks stay (ENG-2161) |
| `where: { field: undefined }` meant "no filter"                                   | would return every row when a profile was missing                                                                           | explicit `Unauthorized` throws or explicit `undefined` guards, commented                                        | keep                                                 |
| `where: { field: null }` meant `IS NULL`                                          | Drizzle `eq(col, null)` is never true                                                                                       | explicit `isNull` branches                                                                                      | keep                                                 |
| Rows came back in insertion order (`created_at, id`) with no `orderBy`            | Drizzle's lateral-join plans return other orders; pages that take the first row per key showed different data               | explicit `orderBy(createdAt, id)` wherever a consumer takes `[0]`, dedupes by key, or renders in received order | keep                                                 |
| A to-one relation shared by many rows was loaded once and reused                  | Drizzle recomputes the subtree per row (14 ms → 4.3 s on the fellow students page)                                          | load the shared subtree once and attach it in JS                                                                | keep until Drizzle 1.0 is evaluated                  |
| `_count: { relation }` and filtered counts                                        | no equivalent in RQB v1                                                                                                     | correlated count subqueries in `extras` (`countOf` in `db/sql.ts`), read as `xCount` / `count` fields           | done in ENG-2161                                     |
| `NULL` in a `text[]` column read as `[]`                                          | Drizzle types and returns `string[] \| null`                                                                                | `?? []` at the readers; the columns should be `NOT NULL DEFAULT '{}'` (ENG-2160 area)                           | keep until the migration                             |
| Raw `COUNT(*)` as BigInt, `AVG`/numeric as Decimal-ish strings                    | pg returns int8 as string and numeric as string                                                                             | `::int` and `::float8` casts in SQL where callers expect numbers                                                | parser removed in ENG-2161; casts keep               |
| Array parameters in `$queryRaw` sent as Postgres arrays                           | drizzle `sql` expands arrays into `$1, $2, ...`; `ANY(${ids})` breaks, hand-written `IN (${ids})` renders a row constructor | `inArray(sql.raw("im.user_id"), ids)` inside the template, or `ANY(sql.param(ids)::text[])`                     | keep                                                 |
| `in: []` returned no rows without error                                           | drizzle `inArray(col, [])` renders `false` in 0.45 but throws in older versions                                             | explicit empty-list guards                                                                                      | keep                                                 |
| `include` returned `Date` for timestamps, UTC for `timestamp without time zone`   | pg parses naive timestamps as local time                                                                                    | Drizzle`s own `mode: "date"` mapping; raw queries that return dates use the builder                             | parsers removed in ENG-2161                          |
| `Prisma.XGetPayload` prop types followed the query loosely                        | one type declared a `leader` relation no query ever loaded                                                                  | result types exported next to the query functions                                                               | keep                                                 |
| Implicit enum objects and model types from `@prisma/client`                       | 221 importing files                                                                                                         | `db/enums.ts` (plain objects); model types inline as `typeof table.$inferSelect`                                | enums keep; `db/types.ts` removed in ENG-2161        |

## Drizzle 0.45 workarounds in the code (revisit at the 1.0 upgrade)

| Workaround                                                                       | Where                                                                                                                                                                                                                                                      | Why                                                                                                                               |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Counted table written as SQL text inside `extras`, never `db.$count(other, ...)` | `db/sql.ts` `countOf`, `app/(platform)/admin/hubs/queries.ts`, `lib/actions/implementer.ts`, `lib/actions/school.ts`                                                                                                                                       | drizzle rewrites every column in an `extras` SQL to the current relation's alias, including other tables' columns                 |
| Outer reference qualified explicitly (`"alias"."column"`)                        | `db/sql.ts` `countOf`; derived-table form in `lib/actions/school.ts`                                                                                                                                                                                       | at the root of a query with no `with`, drizzle renders columns unqualified, so `where student_id = "id"` bound to the inner table |
| `extras: (t, { sql }) => ({ ... })` object form                                  | everywhere `extras` is used                                                                                                                                                                                                                                | a per-key function type-checks as `any` and fails at runtime                                                                      |
| `updatedAt: new Date()` in upserts                                               | `lib/actions/session/session.ts`, `lib/actions/group/index.ts`                                                                                                                                                                                             | `$onUpdate` does not run on `onConflictDoUpdate`                                                                                  |
| Shared to-one subtrees fetched once and attached in JS                           | `components/common/schools/school-{students,sessions}-page.tsx`, `lib/actions/fetch-sessions.ts`, `app/(platform)/fel/schools/[visibleId]/*`, `app/(platform)/sc/actions.ts`, `app/(platform)/fel/portal/page.tsx`, `app/(platform)/hc/schools/actions.ts` | lateral join recomputes the subtree per row                                                                                       |
| `inArray(sql\`col\`, ids)` inside raw templates                                  | `lib/actions/ticket/index.ts`                                                                                                                                                                                                                              | array parameter expansion (see table above)                                                                                       |
| `queryRaw`/`executeRaw` and pg type parsers                                      | `db/client.ts`                                                                                                                                                                                                                                             | removed in ENG-2161: `db.execute(sql)` with `::int` casts, or the builder                                                         |

## Legitimate problems the migration found (pre-existing, not caused by it)

- `lib/actions/profile/index.ts`: with a missing identifier, Prisma matched and updated the first row of the table. Fixed in #851 (returns "not found").
- `app/(platform)/sc/actions.ts` `updateSupervisorProfile` filters `supervisor.id = session.user.id` (a user id) and can never match. Preserved; needs its own fix.
- `app/(platform)/sc/reporting/expenses/my-expenses/actions.ts` lists every expense in the supervisor's hub, not only theirs. Preserved; scoping decision needed.
- `sc/clinical/action.ts` `updateTreatmentPlan` updates the plan by `id = caseId` while also setting `caseId`. Preserved.
- `components/common/session/sessions-provider.tsx` typed a `leader` relation that no producer loaded. Type removed in #850.
- `createStudentClinicalCase` and `submitStudentDetails` derive visible ids from `count(*)`; concurrent creates collide.
- Nullable columns that are never meant to be null: `treatment_interventions`, `planned_treatment_intervention` (`text[]`), `interventionSession.hubId`, `interventionSession.sessionId`.
- Missing indexes on columns every page filters: `triage_events(hub_id)`, `clinical_screening_info(student_id)`, `clinical_screening_info(current_supervisor_id)`, `intervention_groups(leader_id)`, `ticket_escalations(ticket_id, created_at)`, `intervention_sessions(hub_id, session_date)`.

## Over-fetching on hot paths

- `app/auth.ts` `currentSupervisor()`: every supervisor request loads the hub with all schools and
  all their intervention sessions, every fellow with attendances, repayment requests, complaints,
  reporting notes, evaluations and weekly ratings. Most pages read two or three of those fields.
  Split into `currentSupervisorLite()` plus per-page loaders; the lite variant already exists.
- `/admin/hubs` returns 29.8 MB of HTML in 1,025 ms and `/hc/schedule` 5.5 MB (ENG-2151 baseline).
  Both serialise whole relation trees into the RSC payload. Paginate or select columns.

## Types that hide nulls

- `lib/actions/implementer.ts` `fetchImplementerFellowRatings` and three schedule components
  declare `averageRating: number`, but `AVG()` over a fellow with no ratings is `NULL`.
  `app/(platform)/hc/fellows/components/columns.tsx` already types it `number | null`. Align all four.
- `_count` selects on optional relations were typed as always present; the new `*Count` extras
  make the numbers explicit. Check readers that did `?? 0` for a reason.

## Database naming (tracked in ENG-2160)

- Ten camelCase columns (`caseId`, `clinicalLeadId`, `referredTo_supervisor_id`, `schoolId`,
  `sessionType`, `addedBy`, ...) and one misspelling (`program_session_attendace`). Raw SQL has to
  quote them.

## Patterns to standardise after the migration

- Result types belong next to the query function (`export type X = Awaited<ReturnType<typeof fn>>`);
  the ENG-2152 codemod left `#/db/types` imports in 39 files that each conversion removes as it goes.
- Raw SQL only where the builder cannot express the query (window functions, CTE-heavy dashboards).
  Trivial `$queryRaw` counts became `db.$count`.
- Prisma threw on `update`/`delete` of a missing row; Drizzle returns zero rows. Every converted
  write checks `.returning()` and throws, which is more explicit but repetitive. A tiny
  `updateOne(table, set, where)` helper would remove the repetition; ENG-2161 decided against
  adding one, the explicit checks stay.
- `inArray(col, [])` needs a guard for empty lists; Prisma's `in: []` did not.

## Drizzle 0.45 pitfalls learned (keep until the 1.0 upgrade)

- Inside a relational-query `extras`, drizzle rewrites every column reference to the current
  relation's alias, including columns of other tables. `db.$count(otherTable, eq(otherTable.fk, t.id))`
  therefore mis-counts silently. Write the counted table as SQL text:
  `sql<number>\`(select count(*)::int from students s where s.assigned_group_id = ${t.id})\`.as("students_count")`.
`where`/`orderBy`subqueries via`inArray` are unaffected. Found independently by ENG-2154 and ENG-2158.
- The `extras` callback wraps the whole object (`extras: (t, { sql }) => ({ ... })`); a per-key
  function type-checks as `any` and fails at runtime.
- `$onUpdate` does not fire on `onConflictDoUpdate`; set `updatedAt` explicitly in upserts.
- At the root of a relational query with no `with`, `extras` values are not run through their
  `mapWith` decoder (nested under a relation they are). `count(*)` therefore comes back as the
  int8 string once the global `int8 → Number` parser is gone. Cast in SQL (`count(*)::int`) instead
  of relying on `.mapWith(Number)`; `countOf` in `db/sql.ts` does. Found by `tests/unit/db-sql.test.ts`
  on ENG-2161.
- At the root of a relational query with no `with`, drizzle renders column references unqualified
  (single-table shortcut). A correlated subquery in `extras` then compares against the inner
  table's own column: `where "student_id" = "id"` gave 0 where Prisma gave 1. Always qualify the
  outer reference explicitly (`"<alias>"."<column>"`, alias = `db._.tableNamesMap[tableName]` at
  the root, the alias proxy's table name when nested). Found by the page-dump diff on ENG-2154.
- A to-one relation with a heavy subtree (`student → school → interventionSessions → session`) is
  loaded once by Prisma and reused; drizzle's lateral join recomputes it per row. Fetch such a
  subtree once and attach it in JS. `/admin/schools/…/students` went from 95 ms to 1.5 s before this.
- The order of to-many relations is unspecified in both ORMs and does differ between them; UI that
  shows a list in received order should sort explicitly. It is not only cosmetic: the student group
  evaluation report reduces `findMany` rows to one per fellow, so the first row wins and the page
  showed a different group under Drizzle. Every `findMany` whose consumer takes the first element or
  dedupes by key needs an explicit `orderBy`.
- Drizzle's `sql` template expands a JavaScript array parameter into `$1, $2, ...`. Prisma sent it
  as one Postgres array. `= ANY(${ids}::text[])` therefore breaks with "malformed array literal",
  and a hand-written `IN (${ids})` renders `IN (($1, $2))`, a row constructor, which fails too.
  Inside a raw template write `${inArray(sql\`im.user_id\`, ids)}`(with the empty-list guard) or`ANY(${sql.param(ids)}::text[])`. Found by the
  page-dump diff on ENG-2158: the supervisor tickets page rendered empty because the failure was
  caught and returned as an empty result.
- "No reader uses this field" must be proven by tracing data flow to the component, not by finding
  no type declaration: the admin schedule read `groups._count.students` through optional chaining,
  so dropping it passed typecheck and the page dump (the data loads through a server action after
  render). Fixed in #849.

## Per-ticket notes

### ENG-2154 sessions and schedule

- Three pages (`hc/schedule`, `sc/schedule`, `school-sessions-page`) ran identical supervisor and
  fellow-ratings queries; now shared in `lib/actions/schedule-data.ts`. `hc/supervisors/actions.ts`
  and `lib/actions/implementer.ts` still carry their own copies.
- `fetchScheduleSupervisors` loads every fellow attendance, group and supervisor attendance of a hub
  on each schedule render; the calendar needs them per selected session only. Largest payload on
  `/hc/schedule`.
- The five `school-*-page.tsx` each re-resolve the school by `visibleId` and re-fetch
  `interventionSessions`; one shared loader would cut four queries per navigation.
- `school-groups-page.tsx` and `school-fellows-page.tsx` fetch all students and reports for the
  school and filter in JS per group or fellow (O(groups × students)).
- (removed in ENG-2161, no callers) `fetchDayFellowAttendances` built `IN (...)` from filter keys and broke on an empty list; use
  `= ANY(${array})`. Its date range is exclusive while `fetchInterventionSessions` is inclusive, so
  boundary-day sessions differ between calendar and attendance table.
- The per-fellow average-rating SQL exists five times (`hc/fellows/page.tsx`, `admin/fellows/page.tsx`,
  `fetchImplementerFellowRatings`, and two more); a view or one function would remove them.
- `interventionSession.hubId` is nullable while every schedule query filters on it; a composite
  index on `(hub_id, session_date)` would serve those filters (only `school_id` is indexed).
- `sessions-provider.tsx`'s `Session` type declared a `leader` relation no producer ever loaded; the
  `Prisma.*GetPayload` prop types in `components/common/session/*` have drifted from their producers.

### ENG-2155 schools, students, fellows, supervisors

- `hc/students/page.tsx`, `sc/students/page.tsx`, `admin/students/page.tsx`: near-duplicate ten-query
  dashboards differing only in scope; one function taking a scope filter would remove ~500 lines.
  `hubClinicalCases`/`hubClinicalSessions` load full rows only to count them client-side.
  `sc/students/page.tsx:59` fetches `_schools` and never uses it.
- `sc/actions.ts:20` `loadFellowsData` and `fel/portal/page.tsx:19` duplicate the same six-level
  include tree; `fel/portal` builds a `FellowsData` with `as` casts.
- `hc/fellows/page.tsx` and `admin/fellows/page.tsx`: identical raw fellow query; complaints and
  groups are fetched for the whole hub and matched per fellow in `filter` loops.
- `lib/actions/supervisor/index.ts` `markManySupervisorAttendance`: one find plus one write per
  supervisor (2N queries); a single upsert on `(supervisor_id, session_id)` needs a unique index
  that does not exist.
- `lib/actions/student/index.ts:117` `submitStudentDetails` builds a visible id from `count(*)`
  over all students (race-prone, full-table count per insert); `moveStudentToSchool` deletes all
  attendances outside the transaction's read.
- `hc/schools/actions.ts` `fetchSchoolData` loads every student with `assignedGroup` for every
  school in the hub to render the schools table.
- `sc/actions.ts:250` `updateSupervisorProfile` filters `supervisor.id = session.user.id` (a user
  id), so it can never match; pre-existing bug, kept.
- Missing indexes for filters used on every page: `clinical_screening_info(student_id)`,
  `clinical_screening_info(current_supervisor_id)`, `intervention_groups(leader_id)`.

### ENG-2156 clinical and triage

- `lib/actions/clinical/cases.ts:62-119`: four raw aggregate queries each re-join supervisors,
  students, schools and hubs; one query over a shared CTE with `GROUP BY GROUPING SETS` would cut
  four round trips to one. The "latest risk level" subquery is repeated in SELECT and GROUP BY.
- `lib/actions/clinical/students.ts`: fifteen raw count queries over the same `students JOIN schools`
  scope; two functions could each be one grouping-sets statement.
- `sc/clinical/action.ts:getClinicalCases` and `cl/clinical/actions.ts:getClinicalCasesCreatedByClinicalLead`
  are the same 40-line mapping with a different filter. `getSchoolsInHub` and
  `getSchoolsInClinicalLeadHub` are identical and load every student of every school for a picker
  that needs id and name.
- `sc/clinical/action.ts:updateTreatmentPlan:474` updates `clinicalFollowUpTreatmentPlan` by
  `id = data.caseId` while also setting `caseId`; likely a latent bug, preserved as-is.
- `sc/triage/action.ts:getTriageEventsForSupervisor` and `getTriageDashboardStats` load every event
  into memory to count or to join cases; a `LEFT JOIN`/`EXISTS` would make each one query.
- `triage_events(hub_id)` has no index although audits, gaps and fidelity filter on it.
- `text[]` columns `treatment_interventions` and `planned_treatment_intervention` are nullable but
  never meant to be; Prisma masked NULL as `[]`. A `NOT NULL DEFAULT '{}'` migration removes the
  `?? []` guards.
- `createStudentClinicalCase` derives `visibleId` from `count(students)`; two concurrent creates collide.
- Prisma `where: { field: undefined }` meant "no filter" and would have returned every row when a
  profile was missing; the conversion throws `Unauthorized` there instead (unreachable in practice).

### ENG-2157 reporting, expenses and recordings

- `hc|sc|ops/reporting/expenses/fellows/actions.ts`: three near-identical copies of
  `calculateAmounts`/`calculateSessionCounts` whose pre/main-session matching differs per copy, so
  the same fellow can count differently per role.
- `lib/actions/expenses/payout-history.ts:60` and `ops/.../payout-history/actions.ts:75`: one
  `fellowDetails` query per payout date inside `Promise.all` (N+1). The `confirmedAt` subselect uses
  `LIMIT 1` without `ORDER BY`.
- `lib/actions/expenses/complaints.ts:16` loads every attendance's session and all payout statements
  per fellow to compute counts in JS.
- `hc/.../school-reports/session/actions.ts:15` pulls every occurred session with ratings, notes and
  comments for the hub and aggregates in JS.
- `sc/.../my-expenses/actions.ts:10` lists every expense in the supervisor's hub, not only their own;
  looks like a scoping bug.
- `recordings/actions.ts`: three places re-spell the four-column unique key; the `PROCESSING` update
  happens after the external job is created, so a crash between leaves an orphaned remote job.
- `lib/actions/expenses/complaints.ts` `loadPaymentComplaints`: one lateral-join query (Prisma ran
  eight) that fetches full `intervention_sessions` and `session_names` rows per attendance to read
  `amount`, `sessionType`, `sessionLabel`. Locally it is 6 ms slower than Prisma's eight keyed
  queries because round trips cost ~0.2 ms there; on RDS the single round trip wins. Selecting only
  those columns would shrink the JSON payload either way.
- Indexes worth checking: `payout_statements(executed_at)`, `payout_statements(fellow_id, executed_at)`,
  `fellow_payment_complaints(fellow_attendance_id, status)`, `session_recordings(supervisor_id, archived_at)`,
  `intervention_group_reports(group_id)`.

### ENG-2158 tickets, admin, profile, S3 auth

- `lib/actions/profile/index.ts`: `findFirst({ where: { id: identifier ?? undefined } })` with a missing
  identifier matched the first row of the table and then updated it. The conversion returns
  "not found" instead. Security-relevant; the only intentional behaviour change in the batch.
- `lib/actions/ticket/index.ts`: "is the user a party to this ticket" is queried three different ways
  across four functions; `getTicketEscalationStatus` makes four sequential round trips;
  `ticket_escalations` is filtered by `ticket_id` and ordered by `created_at` everywhere with no index
  on either; the ADMIN recipient handler loads every admin user and membership to pick one.
- `app/(platform)/admin/hubs`: loads, per hub, every school with every session, rating, student and
  group in one request (the 29.8 MB response). Students and sessions should load per expanded row.
- `lib/s3/auth/authorize-recording-upload.ts`: the four-column uniqueness pre-check duplicates the
  unique index and races; rely on `isUniqueViolation` at insert time.
- `proxy.ts` imports `sessionCookie` from `lib/auth/session.ts`, which imports the adapter and so the
  database client; the proxy stays DB-free only by never calling it. Moving `sessionCookie()` to its
  own module would make the "middleware cannot reach the DB" rule enforceable by import graph.

### ENG-2159 seed scripts (`db/seed/`)

- Prisma magic exposed: `createMany` chunked around the 65535-parameter limit and accepted an empty
  array; Drizzle `values([])` throws and a 48k-row insert would exceed the limit. Two helpers in
  `db/seed/seed.ts`, `insertMany` and `insertManyReturning`, chunk at 1000 rows and skip empty
  input. `createManyAndReturn({ include })` issued a second relation fetch; the seed attaches the
  hub row from memory instead.
- Drizzle workaround: a generic `db.insert(table).values(rows).returning()` helper needs an
  `as InferSelectModel<T>[]` cast on the result.
- Pre-existing problems: the seed is not run-to-run deterministic because `Math.random()` gates faker
  calls (`mpesaName`, gender, static `groupType`); `createSupervisors` maps dynamic supervisors with
  `supervisorEmail` while the objects carry `email`, so 84 supervisor users get `email = NULL`;
  `schools[0]` and `findMany` without `orderBy` rely on insertion order to find the static school and
  supervisor; static supervisors and fellows get `user_` ids that are then remapped.
- Verified: with a fixed faker seed and a seeded `Math.random`, the Prisma and Drizzle seeds produce
  identical row counts in all 70 tables and identical digests over 48 column checks (see PR).
