# Data access layer: known problems

Open issues found while working through the query layer. None has a ticket yet. They are listed
here so they are not lost; split them into Linear before picking any of them up.

## Correctness

These change what a user sees, so they are the ones worth doing first.

- `app/(platform)/sc/actions.ts`, `updateSupervisorProfile` filters `supervisor.id = session.user.id`.
  That compares a supervisor id with a user id, so it can never match and the update never applies.
- `app/(platform)/sc/reporting/expenses/my-expenses/actions.ts` lists every expense in the
  supervisor's hub rather than only their own. It needs a scoping decision as well as a fix.
- `sc/clinical/action.ts`, `updateTreatmentPlan` updates the plan by `id = caseId` while also
  setting `caseId`.
- `createStudentClinicalCase` and `submitStudentDetails` derive a visible id from `count(*)`.
  Two concurrent creates produce the same id.

## Types that hide nulls

- `lib/actions/implementer.ts`, `fetchImplementerFellowRatings` and three schedule components
  declare `averageRating: number`, but `AVG()` over a fellow with no ratings returns null.
  `app/(platform)/hc/fellows/components/columns.tsx` already types it `number | null`; align the
  other four.

## Over-fetching

- `app/auth.ts`, `currentSupervisor()` loads the hub with every school and all their intervention
  sessions, and every fellow with attendances, repayment requests, complaints, reporting notes,
  evaluations and weekly ratings. Most pages read two or three of those fields. A
  `currentSupervisorLite()` already exists; move pages onto it plus per-page loaders.
- `/admin/hubs` renders about 32 MB of HTML in roughly 900 ms, and `/hc/schedule` about 5 MB. Both
  serialise whole relation trees into the payload. Paginate, or select columns.

## Missing indexes

Columns that pages filter on, with no index:

```
triage_events(hub_id)
clinical_screening_info(student_id)
clinical_screening_info(current_supervisor_id)
intervention_groups(leader_id)
ticket_escalations(ticket_id, created_at)
intervention_sessions(hub_id, session_date)
```

Separately, 43 foreign key columns have no index on the child side. That does not matter for
ordinary reads, but it makes any rewrite of a parent key extremely slow, because each parent row
forces a full scan of the child table. `drizzle/0001_backfill_typeid_ids.sql` builds those indexes
for the duration of its rewrite and drops them again. Making some of them permanent is worth
measuring: every index also costs on each write.

## Columns that should not be nullable

`treatment_interventions`, `planned_treatment_intervention` (both `text[]`),
`interventionSession.hubId` and `interventionSession.sessionId` are nullable but never meant to
hold null.

## Database naming

Ten columns break the snake_case convention and one is misspelled: `caseId`, `clinicalLeadId`,
`referredTo_supervisor_id`, `schoolId`, `sessionType`, `addedBy` and
`monthly_supervisor_evaluation.program_session_attendace`. Raw SQL has to quote them. Tracked in
ENG-2160, currently in the backlog.

## Seed and application disagree

- The seed builds `students.visible_id` with `objectId`, while the application builds a readable
  id. That is a difference of form, and `visible_id` is a foreign key target, so it needs its own
  decision.
- The application is inconsistent with itself on intervention session ids: `isess_` when a session
  is created through the session action, `session_` when a school is set up.
