# AGENTS.md

Guidance for coding agents in this repository. `CLAUDE.md` imports this file; edit this one.

The Shamiri Digital Hub is the operational back-end for the Shamiri Institute: programs, clinical screening, fellow supervision and administration across hubs and schools. Each role has its own dashboard under `app/(platform)/` (`admin`, `hc`, `sc`, `fel`, `cl`, `ct`, `ops`); roles are `ImplementerRole` in `db/enums.ts`.

## Done means

A task is done when these pass:

```bash
npm run typecheck
npm run lint        # ESLint, Next.js rules
npm run stylecheck  # oxfmt --check, oxlint --type-aware
```

and the tests that cover the change pass. Use npm only.

## UI

- Build from `components/ui` (shadcn on Radix, variants through `cva`) and `components/common` (feature components, `data-table.tsx`). Extend an existing component through props or composition before writing a new one.
- Style with Tailwind classes merged through `cn()`. The design tokens (`shamiri-new-blue`, `red-bg`, `blue-border`, ...) are the `@theme` colors in `app/globals.css`; use them in place of the default palette (`bg-red-500`) or arbitrary values. No inline `style`, no new CSS files.
- Forms use React Hook Form with Zod.

## React hooks

oxlint's `hooks-policy/justify` rule (`lint/hooks-policy.mjs`) fails any `useEffect`, `useLayoutEffect`, `useMemo` or `useCallback` without a comment on the line above that starts `effect:`, `memo:` or `callback:` and states the reason. Write a handler or a derived value instead:

- Work a user event starts goes in the handler (`onClick`, `onOpenChange`, `onSubmit`).
- Values derived from props or state are computed during render.
- Data comes from a Server Component or a server action.
- An effect is for a real external subscription only: a DOM listener, a timer, a third-party widget.
- Memoize only for a measured or obvious hot path, and say why in the PR. A lint rule whose only fix is memoization is not enforced.
- A dialog's form lives in a component inside `DialogContent`, so Radix unmounts it on close and each open starts from the row's values.
- A multi-step dialog (form, then confirm) keeps its steps as state in one `Dialog`. Example: `components/common/fellow/fellow-dropout-form.tsx`.
- Clear a dependent field (sub-county, absence reason) in the parent field's `onValueChange`. `hooks-policy/no-form-reset-in-effect` fails on `reset` or `setValue` in an effect.

## Data

Drizzle ORM 0.45 on PostgreSQL (`pg` driver). Write native Drizzle: relational queries, the core builder, `$inferSelect`, column modes and `mapWith`. If Drizzle cannot express something, ask before adding a wrapper.

- `db/schema.ts` is hand-maintained and the source of truth; never run `drizzle-kit pull` over it. Table variables are lowerCamel model names (`interventionSession`); columns and relations are camelCase. `db/relations.ts` holds relations, `db/enums.ts` the enums as plain objects (safe in client components), `db/client.ts` the `db` instance, `Transaction`, `isUniqueViolation` and `isSerializationFailure`.
- Reads that load relations use `db.query.<table>.findMany({ with })`; aggregates and writes use the core builder. Use `db.execute(sql`…`)` only where the builder cannot express the query: rows come back raw, so cast `count(*)::int` and prefer the builder for date columns.
- Inside `where`, `orderBy` and `extras` callbacks, use the callback's table parameter, never the imported table; nested relations are aliased.
- Count related rows in `extras` with `countOf` from `db/sql.ts`. `db.$count` inside `extras` breaks, because drizzle 0.45 rewrites every column reference to the current alias.
- A `findMany` whose consumer takes the first row, dedupes by key or renders in received order needs an explicit `orderBy`.
- A to-one relation with a heavy subtree under every row is recomputed per row. Load the subtree once and attach it in JS.
- In `sql` templates a JavaScript array expands to `$1, $2, ...`. Use `inArray(sql.raw("col"), ids)` or `sql.param(ids)`, and guard empty lists.
- `update` and `delete` match zero rows silently. Check `.returning()` and throw where the caller expects not-found.
- Export each query's result type beside it (`export type X = Awaited<ReturnType<typeof fn>>`) and type consumers with it.
- Helpers that run inside `db.transaction` take a `Transaction` from `#/db/client`.
- A mutation server action calls `refresh()` from `next/cache` once its write succeeds, after any transaction commits. The app has no server cache, so the client makes no follow-up revalidate call.
- Server-side date maths ("today", which days a calendar shows) uses the viewer's zone from the `tz` cookie (`TIME_ZONE_COOKIE` in `lib/schedule-view.ts`). When the cookie is missing, render without data and let the client set it and refresh; never fall back to a fixed zone. The exception is scheduling a school's sessions, which happen at the school and use `Africa/Nairobi`.

Schema changes:

1. Edit `db/schema.ts` (and `db/relations.ts` / `db/enums.ts`).
2. `npm run db:generate`, then read the SQL. A data migration is `npx drizzle-kit generate --custom --name <what>`.
3. `npm run db:migrate`; prove it from scratch with `npm run db:reset`.
4. `npm run db:check` (CI runs it): every new foreign key needs an index on its columns, and a migration that drops a column or table starts with `SET LOCAL lock_timeout = '5s';`.
5. Update `db/seed/` if the seed needs the change.

## Auth

better-auth. Pages get the signed-in user from the role helpers in `app/auth.ts` (`currentSupervisor()`, `currentHubCoordinator()`, ...); server actions authorize with `requireAuthRole` and `requireHubRole` from `lib/auth/`.

`proxy.ts` only checks that the session cookie exists, and imports nothing that queries the database. The RDS security group admits only the static egress IPs of Vercel Functions, and Routing Middleware runs on other IPs, so a query there fails every request in production while passing locally. Role checks go in the `app/auth.ts` helpers, not in `proxy.ts` or a `layout.tsx`.

Every export of a `"use server"` file is a public POST endpoint, even when only server components call it. Take the scope (hub, fellow, implementer) from the session, never from the arguments.

## Testing

- `npm test` runs Playwright against `next dev`; `npm run test:prod` builds and runs against `next start`, as CI does. `npm run test:unit` runs Vitest.
- E2E specs sign in as seeded users picked from the database (`signInAs`, `signInWithEmail` in `tests/helpers.ts`).
- A spec that changes data creates its own rows, or picks rows no other spec edits, and removes what it made.
- Test behaviour through real dependencies: the local Postgres, and an S3-compatible server such as MinIO for uploads. Leave out a test that would need a mocked module, env, SDK client or network call.
- E2E specs drive the UI. Action IDs and encoding are framework internals, so a spec never posts to a server action directly; `tests/e2e/personnel-authz.spec.ts` predates this rule.
- After a mutation, assert through the UI after a reload. Read the database only for what no page shows (values the server takes from the session, stored but undisplayed data, revoked sessions, writes that must not happen), with a comment saying so.

## Code style

- Names say what a value holds and whose it is: `coordinatorHubId`, `callerMayChangeStudent`, not `hubId`, `row` or `allowed`. Rename a generic key on destructure (`const { hubId: coordinatorHubId } = ...`).
- Names carry intent, so comments are for code that is very non-obvious, and for domain context the code cannot state (which intervention a seed row exists for). This includes JSDoc on helpers and headers on spec files.

## Commits

Conventional Commits (`fix(scope): ...`). The message explains why.

## Deploy

Vercel, with preview deployments per branch. `vercel:build` runs production migrations.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- potetos-for-everyone:begin -->

## potetos-for-everyone

For non-trivial engineering work, use the Agent Skill at `.agents/skills/poteto-mode/SKILL.md`.
It routes the task to a playbook, loads supporting skills progressively, prefers simple changes,
and requires evidence against the real artifact. Canonical skills are adapted from Lauren Tan's pstack.
If native skill discovery is unavailable, read that SKILL.md and its selected playbook manually.
<!-- potetos-for-everyone:end -->
