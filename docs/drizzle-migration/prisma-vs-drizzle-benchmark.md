# Prisma versus Drizzle: end-to-end benchmark and correctness comparison

Measured on 2026-09-21. It compares the last Prisma release, `aca22fc5` (`chore(release): 1.37.0`),
with the head of `dev`, `15514870` (`refactor(db): remove the Prisma-compatibility layer`). Twelve
commits separate them, which is the whole ENG-2137 migration.

|                  | before                              | after                            |
| ---------------- | ----------------------------------- | -------------------------------- |
| commit           | `aca22fc5`                          | `15514870`                       |
| ORM              | prisma 6.19.3                       | drizzle-orm 0.45.2               |
| Next.js          | 16.3.4                              | 16.3.4                           |
| benchmark result | `bench/results/prisma-aca22fc.json` | `bench/results/drizzle-dev.json` |
| page dumps       | `bench/dumps/prisma-aca22fc/`       | `bench/dumps/drizzle-dev/`       |

Both runs used one production build (`next build`, then `next start -p 3100`), the same local
Postgres 18.6 database, 3 warm-up requests and 20 measured requests per page. Local round trips are
about 0.2 ms, so the numbers measure ORM and render cost, not network latency.

## Result

Drizzle is faster on every page that moved beyond the measurement noise, and it sends 29% less
HTML. No page renders different text.

| measure                          |  before |   after | change |
| -------------------------------- | ------: | ------: | -----: |
| sum of page p50 (82 pages)       | 4022 ms | 2969 ms | -26.2% |
| median page p50                  |         |         |  -9.3% |
| pages slower beyond jitter       |         |       0 |        |
| pages faster beyond jitter       |         |      21 |        |
| total HTML rendered              | 92.6 MB | 65.6 MB | -29.2% |
| pages whose visible text changed |         | 0 of 82 |        |

"Beyond jitter" is the gate `docs/drizzle-migration/plan.md` defines: more than 10% _and_ more than
5 ms. Below it, two runs of identical code differ by up to 12%.

## Where the time went

The seven school detail pages dominate the gain. They are the pages that loaded a relation subtree
under every row under Prisma.

| page                           | role            | before p50 | after p50 | change |
| ------------------------------ | --------------- | ---------: | --------: | -----: |
| /admin/schools/AFBGJS/students | ADMIN           |     146 ms |     37 ms | -74.7% |
| /sc/schools/SOBHA_SCH/sessions | SUPERVISOR      |     139 ms |     39 ms | -72.2% |
| /hc/schools/AJYNCE/students    | HUB_COORDINATOR |     108 ms |     31 ms | -71.7% |
| /fel/schools/AUTNRJ/sessions   | FELLOW          |      87 ms |     26 ms | -70.0% |
| /admin/schools/AFBGJS/sessions | ADMIN           |     135 ms |     43 ms | -68.2% |
| /sc/schools/SOBHA_SCH/students | SUPERVISOR      |     140 ms |     46 ms | -66.9% |
| /hc/schools/AJYNCE/sessions    | HUB_COORDINATOR |      98 ms |     37 ms | -62.4% |
| /admin/hubs                    | ADMIN           |    1142 ms |    890 ms | -22.0% |
| /hc/schools                    | HUB_COORDINATOR |     165 ms |    131 ms | -20.8% |
| /hc/schedule                   | HUB_COORDINATOR |     171 ms |    141 ms | -17.7% |

Three pages read slower in the table but stayed inside the jitter band, so the gate does not count
them: `/fel/schools/AUTNRJ/students` (12 ms to 17 ms), `/sc/tickets` (24 ms to 28 ms) and
`/sc/reporting/monitoring-and-evaluation` (19 ms to 22 ms). All three render in under 30 ms, which
is where the measured noise is widest. The full table is `npm run bench:compare -- prisma-aca22fc
drizzle-dev`.

## Data fetching

Payload size is the clearest evidence that the conversion narrowed what the queries load. The same
seven pages shed 85% of their HTML while showing the same text.

| page                           |  before |   after |  change |
| ------------------------------ | ------: | ------: | ------: |
| /admin/schools/AFBGJS/students | 5.77 MB | 0.83 MB | -4.9 MB |
| /admin/schools/AFBGJS/sessions | 5.53 MB | 0.88 MB | -4.7 MB |
| /sc/schools/SOBHA_SCH/sessions | 4.70 MB | 0.72 MB | -4.0 MB |
| /hc/schools/AJYNCE/students    | 4.04 MB | 0.63 MB | -3.4 MB |
| /sc/schools/SOBHA_SCH/students | 4.35 MB | 1.06 MB | -3.3 MB |
| /hc/schools/AJYNCE/sessions    | 3.91 MB | 0.68 MB | -3.2 MB |
| /fel/schools/AUTNRJ/sessions   | 3.68 MB | 0.50 MB | -3.2 MB |

Those megabytes were columns and relation rows the page never displayed. The text comparison below
proves nothing visible was lost with them.

`/admin/hubs` still returns 32.6 MB in 890 ms. The migration did not address it and it remains the
largest single cost in the application. It is on the follow-up list in `findings.md`.

## Correctness

Three instruments, all at identical data.

**Rendered text, all 82 pages.** `npx tsx scripts/bench/text-diff.ts bench/dumps/prisma-aca22fc
bench/dumps/drizzle-dev` reports 82 of 82 pages showing identical text. The script strips scripts,
styles and tags from each dumped page and compares what is left.

**Browser render, all 99 pages as all 7 roles.** The new `tests/e2e/platform-pages.spec.ts` opens
every platform page as every role and records headings, table row counts and the text of `main`.
Both checkouts produced 99 pages carrying 479 table rows in total. No page reached the error
boundary and none redirected to the login screen. The only browser console errors are 208 copies of
the Vercel Speed Insights script returning 404, which is local-environment noise.

**Payload shape.** `npm run bench:diff` reports all 82 pages differing, and that is expected across
this boundary rather than a defect. It compares the React Server Components payload, where Prisma
wrote `"_count":{"students":350}` and Drizzle writes the same number under its own name. Forty of
the 82 Prisma dumps carry a `_count` object. Use `text-diff.ts` when the two sides are different
ORMs and `diff.ts` when they are not.

## Test suite

Both checkouts give the same result, so nothing in the migration changed test behaviour.

|         | before | after |
| ------- | ------ | ----- |
| passed  | 52     | 52    |
| failed  | 4      | 4     |
| skipped | 3      | 3     |

The same four tests fail on both sides, for environment reasons that predate this comparison.

- Three `s3-presign-auth` student-attendance tests fail because `.env.development` has no
  `S3_STUDENT_ATTENDANCE_BUCKET`. It also has no `S3_RECORDINGS_BUCKET`, which is why two
  recordings tests skip. The file defines `S3_UPLOAD_BUCKET` only.
- `personnel-authz` fails because the development-only role switcher it measures does not mount
  under `next start`. That test needs the development server.

Quality gates on `dev` after the changes: `typecheck` clean, `stylecheck` clean, `vitest run
tests/unit` 33 passing, `lint` 34 problems. The lint count is identical with the changes stashed,
so none of them come from this work.

## The seed is not reproducible

Running `npm run db:dev:migrate:reset` twice produces different databases. The Prisma-era seed built
1220 users, 135 schools, 52266 students, 1074 fellows and 1215 sessions; the Drizzle reseed on the
same date built 1225, 137, 52529, 1079 and 1233. `faker.seed(7634912)` fixes faker, but six call
sites in `db/seed/seed.ts` call `Math.random()` directly, which nothing seeds.

That matters beyond this comparison. Any before-and-after measurement that reseeds between the two
halves is comparing different databases, and a 2% difference in student count moves page timings on
its own.

This comparison therefore did not measure across two seeds. The Drizzle reseed ran first and is
recorded above as proof that the drizzle-kit migrate and seed path works. The schema was then
rebuilt with `drizzle-kit migrate` and the Prisma-era rows restored from a snapshot taken
immediately after the first benchmark, so both halves read the same rows. Per-table checksums over
66 tables confirm it: every table matches except the NextAuth `sessions` table and
`weekly_hub_reports`, both of which the phase-one test run wrote to after the snapshot.

The restore is also an independent check on the schema: a data-only dump taken from the
Prisma-built database loaded into the drizzle-kit-built schema with zero errors.

## What this session added

- `tests/e2e/platform-pages.spec.ts`: renders all 99 platform pages as all 7 roles, asserts no
  error boundary and no login redirect, and writes a per-role fingerprint to
  `bench/fingerprints/<label>/`. Set the label with `FINGERPRINT_LABEL`.
- `tests/e2e/school-navigation.spec.ts`: the school drill-down for fellow, supervisor and hub
  coordinator. It opens a school from the list through the row menu and walks every tab, checking
  each tab keeps showing that school.
- `tests/e2e/tickets.spec.ts`: a supervisor creates a ticket, finds it in the list and opens it.
  The one flow that writes and then reads its own write back through two different queries.
- `tests/helpers.ts`: `signInAs(context, role)` picks a seeded user for a role from the database
  through the benchmark's own `pickUser`, instead of a hardcoded email.
- `scripts/bench/text-diff.ts`: the visible-text comparison described above.
- `scripts/bench/diff.ts`: stylesheet names are now normalised the way script names already were.
  Without it every page differed on a CSS content hash whenever the two builds differed.
- `playwright.config.ts`: `reuseExistingServer` outside CI, so the suite can run against the
  production server the benchmark uses rather than starting a development server.

The fixture emails in `tests/helpers.ts` no longer match their roles. `wambugu.davis@shamiri.institute`
is the `fellow` fixture but holds three ADMIN memberships in the current seed, so any test using
that fixture exercises an admin. The existing tests do not use it, and the new tests avoid the
fixtures for this reason, but `PersonnelFixtures.fellow` is wrong as it stands.

## Reproducing

```bash
npx dotenv -c development -- next build
npx dotenv -c development -- next start -p 3100          # port 3000 is usually the dev server
npm run bench -- --label <name> --base-url http://localhost:3100 --dump bench/dumps/<name>
npm run bench:compare -- prisma-aca22fc <name>           # timings
npx tsx scripts/bench/text-diff.ts bench/dumps/prisma-aca22fc bench/dumps/<name>
PORT=3100 FINGERPRINT_LABEL=<name> npx dotenv -c development -- playwright test
```

Check the server log for `Error` after every run. The Drizzle run logged none; the Prisma run logged
six, all from the missing S3 bucket variables and from Next.js reporting a redirect.
