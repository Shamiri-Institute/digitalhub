# ENG-2137: Replace Prisma with Drizzle

Status: done, 2026-09-21 (all nine PRs; PR 9 is the cutover). Branch: `eng-2137-swap-out-prisma-orm-for-drizzle-in-the-sdh`.

## 1. What we are migrating (measured on `dev` @ aca22fc5)

| Surface                                  | Count                                                                | Notes                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Prisma models / enums                    | 70 / 20                                                              | 1,986-line schema, 179 relations, 166 array columns, 20 JSON columns                                                         |
| Column `@map`s                           | 887                                                                  | 721 are plain camel→snake; 166 are not (e.g. `phq1 → phq_1`), so every column keeps an explicit DB name                      |
| Query call sites (`db.*` / `tx.*`)       | 519 in 89 files                                                      | findMany 143, findFirst 80, update 77, create 53, createMany 32, findUnique 27, createManyAndReturn 24, groupBy 19, count 18 |
| `include:` / `select:` / nested `where:` | 353 / 251 / ~87                                                      | deep includes; `app/auth.ts` `currentSupervisor` is 6 levels                                                                 |
| `_count` in selects                      | 62 (20 read sites)                                                   | several with a filter (`students: { where: { archivedAt: null } }`)                                                          |
| `$queryRaw` / `$executeRaw`              | 62 / 3                                                               | composable fragments via `Prisma.sql`, `Prisma.raw`, `Prisma.empty` (30 uses)                                                |
| `$transaction`                           | 23                                                                   | one `Serializable` isolation level; error `P2034` handled                                                                    |
| `Prisma.XGetPayload<>` types             | 66                                                                   | 31 of them in client components                                                                                              |
| Files importing `@prisma/client`         | 221                                                                  | 153 import `ImplementerRole`; 77 are `"use client"` files (enums only)                                                       |
| Unique-violation handling (`P2002`)      | 6 sites                                                              | plus 1 `P2034`                                                                                                               |
| Seed                                     | `prisma/scripts/seed.ts` 2.3k lines, 58 calls                        | faker seeded (`7634912`), so data is deterministic                                                                           |
| Migrations                               | 155 folders                                                          | 10 contain data (`INSERT`/`UPDATE`) statements                                                                               |
| Auth                                     | next-auth 4.24 + `@next-auth/prisma-adapter`, `strategy: "database"` | every request does `getSessionAndUser` + `loadSessionUser`                                                                   |
| Runtime                                  | Next 16.3.4, Node 24, Vercel region `cpt1`, RDS                      | `proxy.ts` never touches the DB (keep it that way)                                                                           |
| Prisma engine on disk                    | 31 MB in `node_modules/.prisma/client`                               | shipped with every function; hurts cold start                                                                                |

## 2. Decisions

1. **Drizzle version: latest stable, `drizzle-orm@0.45.2` + `drizzle-kit@0.31.10`, pinned exact.** No release candidates.
   Relational Queries v1 covers what this codebase uses: `with` (nested includes), `columns`, nested `where` on to-many relations (our ~87 nested filters), `orderBy`, nested `limit`, and `extras` with `db.$count` correlated subqueries for the 62 `_count`s. What v1 lacks we do not use: filtering a parent by its children (`some`/`every`/`none`: 0 uses), nested `offset` (`skip`: 0 uses), `through` many-to-many (the two implicit Prisma join tables were dropped in 2024; `ProjectImplementer` is explicit). Relations are declared per table with `relations(table, ({ one, many }) => ...)`; `drizzle-kit pull` emits `schema.ts` and `relations.ts` in this format.
   Drizzle 1.0 (RQB v2, `defineRelations`) is still a release candidate (rc.4, 2026-06-27). When it goes stable, upgrading is a follow-up ticket: relations file regenerated by `drizzle-kit pull`, queries adjusted per the official v1→v2 guide. Keeping result types at query boundaries (decision 5) confines that change to the query functions.
2. **Driver: `pg` (node-postgres) with a `Pool`.** Battle tested on RDS, in Next's default `serverExternalPackages`, auto-instrumented by `@sentry/nextjs` v10 (free per-query spans in prod traces). `max: 5` per instance, `idleTimeoutMillis: 20_000`.
3. **Auth library: stay on next-auth 4 for this ticket. Adapter: hand-port the 9 methods we use from `@auth/drizzle-adapter`'s pg implementation into `lib/auth/adapter.ts`, typed against `next-auth/adapters`' `Adapter`.**
   Why not the adapter package: it peer-depends on `@auth/core@0.41.3` while next-auth 4 ships `@auth/core@0.34.3` (two copies) and its `Adapter` type is not next-auth 4's (needs a cast). The port is ~80 lines of `select/insert/update/delete` with `eq/and`. Verified from source: it only needs column property names `id,name,email,emailVerified,image`, `userId,provider,providerAccountId,type,...`, `sessionToken,userId,expires`, which our schema already uses. `getSessionAndUser` becomes one join query. `lib/auth/session.ts` keeps its exports (`adapter`, `createSession`, `getSessionAndUser`, `sessionCookie`).
   Why not Auth.js (next-auth 5) now: `next-auth@5` has been a beta since 2023 and still is (`5.0.0-beta.32`, 2026-07-20); the Auth.js project was folded into Better Auth, so v5 is a dead end, not an upgrade. If we change auth libraries the target is Better Auth (`1.7.5`, 2026-09-14: first-class Drizzle adapter, database sessions, Google provider, Next.js cookie plugin). That is a separate ticket after ENG-2137 because it changes the auth tables (`account.providerId/accountId`, `session.token/expiresAt`, `verification`) and so needs a data migration for existing Google-linked accounts plus its own before/after verification, and because doing it in the same window as the ORM swap doubles the blast radius on the one code path every request goes through. Landing Drizzle first makes that move smaller: Better Auth's adapter works from the Drizzle schema directly and would replace our hand-rolled `createSession`/`dev-login`/credential-auth code.
4. **Query style:** RQB (`db.query.x.findMany({ with, columns, where: (t, { eq }) => ..., extras })`) for the read paths that use `include`; core builder (`db.select().from().groupBy()`) for `groupBy`/`aggregate`/`count`; `sql` tagged template for the 62 raw queries (`Prisma.sql → sql`, `Prisma.raw → sql.raw`, `Prisma.empty → sql.empty()`). Same semantics, no query "improvements" inside migration PRs; log those as follow-ups.
5. **Types:** no `GetPayload`. Each query function exports its result type (`export type SchoolData = Awaited<ReturnType<typeof fetchSchool>>["data"]`, already the pattern in `lib/actions/school.ts`); consumers import that. Model row types come from `db/types.ts` (`type Supervisor = typeof supervisors.$inferSelect`). Enums come from `db/enums.ts` (plain `as const` objects, client-safe; `db/schema.ts` builds `pgEnum`s from them). One codemod swaps `from "@prisma/client"` for `#/db/enums` / `#/db/types`.
6. **IDs and timestamps:** `@default(cuid())` (43 tables) → `.$defaultFn(() => crypto.randomUUID())` (no format checks exist; columns are `text`); prefixed ids keep `objectId()` from `lib/crypto.ts`. `@updatedAt` (58 columns) → `.defaultNow().notNull().$onUpdate(() => new Date())`. `pg` type parsers set once in `db/client.ts` so behaviour equals Prisma: `int8 → Number`, `timestamp` (no tz) parsed as UTC, `date` parsed as UTC midnight. A unit test pins these three.
7. **Migrations: squash to one Drizzle baseline, keep Prisma history in git only.** `drizzle-kit pull` against a DB built by the 155 Prisma migrations produces `db/schema.ts` and `db/relations.ts`; `drizzle-kit generate --name baseline` then produces `drizzle/0000_baseline.sql` plus `drizzle/meta/_journal.json`. The 10 Prisma data migrations are not appended: the eight `session_names` inserts are `INSERT … SELECT FROM hubs`, so they insert nothing on an empty database (fresh databases get session names from the seed), and the two updates transformed historical rows through objects that no longer exist (`school_groups`, `session_date_tz`) and would fail. The Prisma migration SQL is archived under `db/legacy-prisma-migrations/` so the parity check can keep rebuilding the historical schema without the Prisma CLI. Existing databases (prod, testing) are marked with an idempotent `scripts/db/baseline-drizzle.ts`: it inserts one row into `drizzle.__drizzle_migrations (hash, created_at)` with `hash = sha256(0000_baseline.sql)` and `created_at = journal.entries[0].when`, and is a no-op when the table already has rows. The migrator applies only entries whose journal `when` is greater than the last `created_at`, so after marking, `drizzle-kit migrate` is a no-op until the next real migration. New migrations: `drizzle-kit generate` (schema diff) or `generate --custom` (data). Parity is proven by `scripts/db/schema-parity.sh` (pg_dump diff of Prisma-built vs Drizzle-built DB).
8. **Rollout: incremental, both clients installed until the last PR.** ~9 PRs. Converted modules import `{ db } from "#/db/client"`; unconverted keep `#/lib/db`. Same DB, no caching in either client, so coexistence is safe. Prisma stays the migration owner until PR 9. Each PR must pass typecheck, lint, stylecheck, unit + e2e, and the benchmark gate for its pages.

## 3. Benchmarks (PR 1, merged before any ORM code)

Goal: a page-level before/after table for all 100 platform pages, produced by one command, comparable across commits.

**Harness (`scripts/bench/`)**

- `routes.ts`: role → paths. Static paths from the 101 `page.tsx` files; `[visibleId]` resolved from the DB (first school in that role's hub); the one `searchParams` page uses its default. API routes excluded.
- `run.ts --label <name> [--runs 20] [--warmup 3] [--base-url http://localhost:3000]`: for each role, mints a session cookie with the existing `createSession(userId)` helper (works under both ORMs), then requests each page sequentially with `fetch`. Records `ttfb` (headers) and `total` (body drained) with `performance.now()`, asserts HTTP 200 (a redirect to `/login` fails fast). Writes `bench/results/<label>.json` with `{ meta: { sha, node, next, orm, date, runs }, pages: [{ role, path, ttfb: { p50, p95 }, total: { p50, p95 } }] }`.
- `compare.ts before.json after.json`: markdown table sorted by worst delta, flags any page whose p50 regresses more than 5%. Paste into the PR.
- `cold.ts`: 10 fresh `node` processes each doing `import("#/db/client")` + `select 1`, p50 of module-init + first query. Also records `du` of the ORM packages and `.next/server` size. This is the Vercel cold-start proxy.
- npm scripts: `bench`, `bench:compare`, `bench:cold`.

**Protocol**

1. Local Postgres seeded once (`db:seed`); never reseed between before/after runs.
2. `next build && next start` (production mode; dev mode measures compilation).
3. Baseline: on `dev` at the PR 1 merge commit run `bench --label prisma-baseline` and `bench:cold`; commit both JSON files.
4. After each conversion PR: rebuild, run with `--label <pr>`, `bench:compare prisma-baseline <pr>`; table goes in the PR description.
5. Second data point after PR 9: same script against a Vercel preview URL (`--base-url`, cookie minted against the testing DB) for real network + RDS numbers. The testing preview is flaky (Prisma P1002); do not chase it, rerun later.

**Gate:** the aggregate lines (sum and median of page p50) must not get worse, and no page may be slower beyond the measured jitter, which is more than 10% _and_ more than 5 ms (two runs of identical code on 2026-09-21 differed by up to ±12% on pages rendering in 10–30 ms, median +0.1%). Any page flagged slower is re-run before it counts. Final report shows per-page deltas, overall median, cold start, and package size. Sentry prod traces after cutover give the third data point (query spans appear automatically with `pg`).

**Baseline facts (2026-09-21, `prisma-baseline.json`, `prisma-cold.json`):** 99 platform pages discovered; 82 measured, 17 are redirect-only index pages (recorded with `redirectTo`, excluded from stats). Sum of p50 totals 3,855 ms. Local Postgres round trips are ~0.2 ms, so these numbers measure ORM CPU overhead and query count, not network latency; the preview-URL run covers latency. Prisma opens a pool of 23 connections on this machine (2 × cores + 1). Cold: client import 28 ms, first query 19 ms; `@prisma` 115 MB + `.prisma` 31 MB + `prisma` CLI 69 MB on disk. Two pages return very large HTML (`/admin/hubs` 29.8 MB at 1,025 ms, `/hc/schedule` 5.5 MB at 187 ms); over-fetching there is a follow-up, not part of the migration.

## 4. Phases and PRs

Each PR: conventional commit, quality gates, e2e, bench compare for the pages it touches. Playwright screenshots before/after for pages whose markup could shift.

### PR 1: `feat(bench): page benchmark harness and Prisma baseline`

Files: `scripts/bench/{routes,run,compare,cold}.ts`, `bench/results/prisma-baseline.json`, `bench/results/prisma-cold.json`, npm scripts. No app code changes.

### PR 2: `feat(db): drizzle schema, client, enums and parity check`

1. `npm i -E drizzle-orm@0.45.2 pg` and `npm i -DE drizzle-kit@0.31.10 @types/pg`.
2. Fresh DB via `prisma migrate deploy`, then `drizzle-kit pull` → move output to `db/schema.ts`, `db/relations.ts`; migrations `out` is `drizzle/`. Post-process the generated schema once (script, then delete it): add `$defaultFn(randomUUID)` to the 43 cuid ids, `$onUpdate` to the 58 `updated_at`, `$type<>` on the 20 JSON columns, and build `pgEnum`s from `db/enums.ts`.
3. `db/enums.ts` (20 enums, `as const` + union types, same names as Prisma), `db/types.ts` (`$inferSelect`/`$inferInsert` per table, `JsonValue`), `db/client.ts` (`Pool`, type parsers, `drizzle({ client, relations })`, `Tx`/`DatabaseCursor` types, `queryRaw<T>(sql)` helper that returns rows, `isUniqueViolation` (23505) and `isSerializationFailure` (40001)).
4. `drizzle.config.ts` (dialect postgresql, `schema: ./db/schema.ts`, `out: ./drizzle`, `dbCredentials.url`), `scripts/db/schema-parity.sh` (two DBs, pg_dump -s, normalize, diff = empty; runs in the e2e workflow), unit tests for the type parsers and `$onUpdate`.
5. Codemod with ast-grep: enum imports `@prisma/client → #/db/enums` across all 221 files (values are identical strings, so Prisma call sites keep compiling). Model type imports → `#/db/types`.
6. Spike items to confirm in this PR and record in the PR body: RDS SSL settings for `pg` (Prisma defaults to `sslmode=prefer`; `pg` does not), that `drizzle-kit generate` on the pulled schema yields exactly one migration and a second `generate` yields none, `db.execute` return shape (`QueryResult.rows` with node-postgres; absorbed by `queryRaw`).

**PR 2 findings (2026-09-21):** `drizzle-kit pull` 0.31 needed four corrections before parity held: it dropped the unique indexes on `students.visible_id` and `implementers.visible_id` (both referenced by foreign keys), it assigned wrong operator classes to some index columns (`date_ops` on a varchar), it emitted the composite primary key of `project_implementers` in column order instead of key order, and it emits timestamps in string mode. Both `push` and `generate` create foreign keys before indexes, so any FK-referenced non-PK column must be a `unique()` constraint, not a `uniqueIndex()`. Postgres 18 names NOT NULL constraints; Prisma's carry names from renamed columns, so the parity script normalizes them. `drizzle-kit push` exits 0 on statement errors; the parity script greps its output. Table variables are lowerCamel Prisma model names (`db.query.interventionSession`), column keys are Prisma field names, relation names are Prisma field names.

**Database findings to revisit (2026-09-21, not part of this ticket, tracked in Linear):**

- `prisma migrate diff` between the migrations-built database and `schema.prisma` is empty: the Prisma schema and its migrations agree. Nothing in the Drizzle schema "corrects" Prisma at the DDL level; the parity check proves both describe the same database.
- Ten columns break the snake_case convention and one is misspelled: `clinical_case_transfer_trail.caseId`, `clinical_expert_case_notes.caseId`, `clinical_session_attendance.caseId`, `clinical_session_attendance.clinicalLeadId`, `clinical_screening_info.clinicalLeadId`, `clinical_screening_info.referredTo_supervisor_id`, `school_feedbacks.schoolId`, `session_names.sessionType`, `student_reporting_notes.addedBy`, `monthly_supervisor_evaluation.program_session_attendace`. Raw SQL quotes several of them (`csa."caseId"`, `csi."clinicalLeadId"`). Renaming is a data migration plus raw-query edits; do it after the ORM swap.
- NOT NULL constraint names carry history from renamed columns and tables: `intervention_sessions.session_date` (was `session_date_tz`), `overall_fellow_evaluations.punctuality_notes` and `weekly_fellow_ratings.punctuality_notes` (were `attendance_notes`), the `student_reporting_notes` table (was `student_complaints`, column `notes` was `complaint`), and four `weekly_hub_reports.*_rating` columns with a `not_null1` suffix (dropped and re-added). Harmless; drizzle-kit does not track these names, the parity script normalizes them.
- Client-side behaviour Prisma never wrote to the database and Drizzle now provides in `db/schema.ts`: `cuid()` ids on 43 tables (new rows get UUID v4 instead of cuid v1; no code checks the id shape), `@updatedAt` on 57 columns (`$onUpdate`, only through the query builder, not raw SQL).
- `_prisma_migrations` stays in the database until PR 9 removes Prisma.

**Coexistence-only code, removed in ENG-2161 after PR 9:** `queryRaw`, `executeRaw` and the `pg` type parsers in `db/client.ts` (they make raw rows look like Prisma's), and `db/types.ts` (a named type per model that TypeScript infers anyway). Conversion PRs type against the query function's exported result type, or `typeof table.$inferSelect` inline, and drop `#/db/types` imports as they touch each file.

### PR 3: `refactor(auth): move session and personnel loading to drizzle`

`lib/auth/adapter.ts` (new), `lib/auth/session.ts`, `lib/auth/session-user.ts`, `lib/auth/dev-login.ts`, `lib/auth-options.ts`, `app/auth.ts` (10 calls incl. the 6-level `currentSupervisor` include + `groupBy`), `lib/default-project-id.ts`, `app/actions.ts`, `lib/actions/active-membership.ts`, `lib/actions/{implementer,project,hub}.ts`, `scripts/auth/get-next-session.ts`, `tests/helpers.ts`. Rewrite `tests/unit/auth-dal.test.ts` against the real local DB (it mocks `#/lib/db` today; user preference is no mocks). Bench: every page (all hit this path).

### PR 4: `refactor(sessions): schedule and session actions to drizzle`

`lib/actions/fetch-sessions.ts`, `lib/actions/session/`, `lib/actions/group/`, `hc|sc|fel|admin/schedule/**` pages and actions, `components/common/schools/*` (5 files, 3 raw queries). Bench: 4 schedule pages, school sessions/groups pages.

### PR 5: `refactor(personnel): schools, students, fellows, supervisors to drizzle`

`lib/actions/school.ts`, `student/`, `fellow/` (36 calls, 3 tx), `supervisor/`, `fetch-personnel.ts`, `hub-coordinator/`, `file/student-attendance/` (serializable tx, `P2034 → 40001`), `hc/schools/actions.ts` (5 raw), `hc/supervisors/actions.ts`, `hc/fellows/actions.ts`, and the hc/sc/fel/admin/cl/ct pages for schools, students, fellows, supervisors. Largest PR; split by entity if review size demands.

### PR 6: `refactor(clinical): clinical and triage to drizzle`

`lib/actions/clinical/*` (23 raw queries with composable `scope` fragments), `clinical-lead/`, `triage/`, `sc/clinical/action.ts` (32 calls, 6 tx), `sc/triage/action.ts`, cl/ct/sc clinical + triage pages, `components/charts/*` (`PickEnumerable` → inferred types).

### PR 7: `refactor(reporting): expenses, reports and recordings to drizzle`

`lib/actions/expenses/*`, `components/common/{fellow-reports,school-reports}/*`, `sc/reporting/recordings/actions.ts` (22 calls, `$executeRaw`, `P2002`), `app/api/recordings/*`, payout-history actions (`Prisma.sql` scopes), hc/sc/ops reporting pages.

### PR 8: `refactor(platform): tickets, admin, ops, s3 and search to drizzle`

`lib/actions/ticket/index.ts` (28 calls, 4 tx, 5 raw), `lib/actions/admin/`, `lib/s3/auth/*`, `components/search-command.tsx`, `components/students-stats.tsx`, `components/profile/*`, `lib/actions/profile/`, remaining pages. After this PR `git grep '#/lib/db'` must return only `lib/db.ts` and the seed scripts.

### PR 9: `feat(db): cut over migrations and seeding to drizzle-kit, remove prisma`

1. `prisma/scripts/*` → `db/seed/*`; `createManyAndReturn → insert().values().returning()`, truncate via `db.execute`.
2. `scripts/db/baseline-drizzle.ts` (idempotent) and `scripts/db/reset.ts` (`DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE`).
3. Scripts: `vercel:prod:build` = `tsx scripts/db/baseline-drizzle.ts && drizzle-kit migrate && next build`; `vercel:seeded:build` = `tsx scripts/db/reset.ts && drizzle-kit migrate && npm run db:seed && next build`; `db:dev:generate` = `drizzle-kit generate`; `db:dev:migrate` = `drizzle-kit migrate`; `db:dev:migrate:reset` = reset + migrate + seed; `db:studio` = `drizzle-kit studio`. CI e2e workflow uses the new scripts; parity check stays.
4. Remove `prisma`, `@prisma/client`, `@next-auth/prisma-adapter`, `prisma/` directory, `lib/db.ts`; drop `?pool_timeout=30` from env docs; oxlint `no-restricted-imports` for `@prisma/client`.
5. Update `CLAUDE.md` (commands, patterns, ast-grep examples for `db.query.*`).
6. Run the full bench + cold + preview bench; write the final comparison into the PR and the Linear ticket.

## 5. Prisma → Drizzle cheat sheet for this codebase

| Prisma                                                            | Drizzle                                                                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `db.x.findMany({ where, include, orderBy, take })`                | `db.query.x.findMany({ where: (t, { eq }) => eq(t.hubId, hubId), with: {...}, orderBy: (t, { desc }) => desc(t.createdAt), limit })` |
| `include: { sessions: { where: {...}, include: {...} } }`         | `with: { sessions: { where: (s, { isNull }) => isNull(s.archivedAt), with: {...} } }`                                                |
| `findUnique` / `findFirst` / `findFirstOrThrow`                   | `db.query.x.findFirst(...)`; throw explicitly for `OrThrow`                                                                          |
| `include: { _count: { select: { students: { where } } } }`        | `extras: { studentsCount: (t) => db.$count(students, and(eq(students.schoolId, t.id), isNull(students.archivedAt))) }`               |
| `orderBy: { updatedAt: { sort: "desc", nulls: "last" } }`         | `orderBy: (t, { sql }) => sql\`${t.updatedAt} desc nulls last\``                                                                     |
| `where: { name: { contains, mode: "insensitive" } }`              | `where: (t, { ilike }) => ilike(t.name, \`%${term}%\`)`                                                                              |
| `where: { id: { in: ids } }`                                      | `where: (t, { inArray }) => inArray(t.id, ids)`                                                                                      |
| `create({ data })` / `createManyAndReturn`                        | `db.insert(x).values(data).returning()`                                                                                              |
| `createMany({ skipDuplicates })`                                  | `.onConflictDoNothing()`                                                                                                             |
| `update({ where: { id }, data })`                                 | `db.update(x).set(data).where(eq(x.id, id)).returning()`                                                                             |
| `upsert`                                                          | `.onConflictDoUpdate({ target, set })`                                                                                               |
| `groupBy({ by, _avg, _count })`                                   | `db.select({ k: x.col, avg: avg(x.r), n: count() }).from(x).groupBy(x.col)` (`avg` returns string → `Number()`)                      |
| `$transaction(async (tx) => …, { isolationLevel: Serializable })` | `db.transaction(async (tx) => …, { isolationLevel: "serializable" })`                                                                |
| `$transaction([a, b])`                                            | `db.transaction(async (tx) => Promise.all([...]))`                                                                                   |
| `$queryRaw<T>\`…\``/`Prisma.sql`/`Prisma.raw`/`Prisma.empty`      | `queryRaw<T>(sql\`…\`)`/`sql`/`sql.raw()`/`sql.empty()`                                                                              |
| `PrismaClientKnownRequestError` `P2002` / `P2034`                 | `isUniqueViolation(err)` / `isSerializationFailure(err)`                                                                             |
| `Prisma.XGetPayload<{ include }>`                                 | export `Awaited<ReturnType<typeof fetchX>>` beside the query                                                                         |
| `Prisma.InputJsonValue`, `JsonValue`                              | `JsonValue` from `#/db/types`                                                                                                        |
| `TransactionCursor` / `DatabaseCursor`                            | same names, exported from `#/db/client`                                                                                              |
| `ImplementerRole.ADMIN` (value) and `ImplementerRole` (type)      | identical, from `#/db/enums`                                                                                                         |

Semantics to keep identical: inside RQB use the callback's table (`(t) => …`), not the imported table, for `where`, `orderBy` and `extras`, otherwise nested aliases break. Aggregations are not allowed in `extras`; `db.$count` subqueries are. Nested `offset` is not supported in RQB v1 (unused here). `$onUpdate` only fires through the builder, not through raw SQL.

## 6. Risks

| Risk                                                                                                                  | Mitigation                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Drizzle 1.0 (RQB v2) goes stable mid-migration                                                                        | stay on 0.45.2 for the whole ticket; upgrade is a follow-up, scoped to query functions because result types are exported at query boundaries |
| Wide RQB queries (`currentSupervisor`) produce large lateral `json_agg` payloads slower than Prisma's batched queries | bench catches it per PR; fall back to core selects for that query; over-fetching there is a follow-up ticket, not this one                   |
| Timezone drift on `timestamp` without tz and `date` columns (`pg` parses as local time; Prisma used UTC)              | type parsers in `db/client.ts` + unit test; Vercel runs `TZ=UTC` so prod is unaffected either way                                            |
| RDS `rds.force_ssl` rejects non-SSL `pg` connections                                                                  | confirm against the testing RDS in PR 2 spike; set `ssl` in `Pool` or `sslmode=require`                                                      |
| Two pools during coexistence                                                                                          | Prisma pool (~5) + `pg` `max: 5` per instance, well under RDS limits                                                                         |
| TypeScript inference cost of deep `with` trees on 70 tables                                                           | export result types at query boundaries; watch `tsc` time in CI                                                                              |
| Data migrations lost in squash                                                                                        | appended to baseline SQL; parity script also diffs row counts of the seeded reference tables (`session_names`)                               |
| Baseline marking wrong on prod                                                                                        | `baseline-drizzle.ts` verified on the testing DB first; `drizzle-kit migrate` is a no-op afterwards and the build fails loudly if not        |
| `tests/unit/auth-dal.test.ts` mocks Prisma shapes                                                                     | rewritten against the local DB in PR 3                                                                                                       |

## 7. Success criteria (ticket) → evidence

1. Prisma removed everywhere → PR 9 deletes the packages; lint rule blocks re-import.
2. Type safety → `tsc --noEmit` clean; no `any` introduced; row and result types inferred from schema.
3. Same migration/seeding semantics → `schema-parity.sh` diff is empty; seeded preview builds and CI e2e pass with the new scripts.
4. Measurable performance improvement → `bench:compare` table (all pages, p50/p95), cold-start table, preview-URL run, Sentry query spans.

## 7a. Results (PR 9, `drizzle-final` vs `prisma-baseline`, same seed, local production build)

| Measure                                           | Prisma                       | Drizzle                                    | Change                                                        |
| ------------------------------------------------- | ---------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Sum of page p50, 82 pages                         | 3,854 ms                     | 2,991 ms                                   | -22.4%                                                        |
| Median page p50 change                            |                              |                                            | -6.2%                                                         |
| Pages beyond jitter (>10% and >5 ms)              |                              |                                            | 14 faster, 0 slower                                           |
| Rendered data (`bench:diff` vs merged dev)        |                              |                                            | 82 pages same rows; 16 differ only in stream or to-many order |
| Cold-start proxy: first query p50                 | 19.2 ms                      | 11.5 ms                                    | -40%                                                          |
| Cold-start proxy: client import p50 (under `tsx`) | 27.9 ms                      | 60.1 ms                                    | +32 ms                                                        |
| ORM footprint in `node_modules`                   | 215 MB (client, engine, CLI) | 36 MB (`drizzle-orm`, `drizzle-kit`, `pg`) | -84%                                                          |

The import cost is the 70-table `db/schema.ts` plus `db/relations.ts` being built at module load; Prisma's
client was pre-generated JavaScript. It is paid once per function instance and is smaller than the first-query
saving after two requests. Type-only and `_count` shape differences are listed in `findings.md`.

## 8. Effort

Solo: ~7–9 weeks (PR 1: 2–3 days, PR 2: 4–5 days, PR 3: 2–3 days, PRs 4–8: ~3–4 days each, PR 9: 3–4 days). PRs 4–8 are independent after PR 3, so a second engineer roughly halves the calendar time. The ticket's 2-point estimate should be revised.
