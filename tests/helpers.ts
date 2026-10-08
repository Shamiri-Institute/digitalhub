import path from "node:path";

import type { BrowserContext } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { createSessionCookie } from "#/lib/auth/test-auth";
import { type Role, pickUser } from "#/tests/platform-routes";

export const PersonnelFixtures = {
  supervisor: {
    email: "shadrack.lilan@shamiri.institute",
    stateFile: path.join(__dirname, "./fixtures/supervisor-state.json"),
  },
  hubCoordinator: {
    email: "brandon.mochama@shamiri.institute",
    stateFile: path.join(__dirname, "./fixtures/hub-coordinator-state.json"),
  },
  fellow: {
    email: "wambugu.davis@shamiri.institute",
    stateFile: path.join(__dirname, "./fixtures/fellow-state.json"),
  },
  clinicalLead: {
    email: "stanley.george@shamiri.institute",
    stateFile: path.join(__dirname, "./fixtures/clinical-lead-state.json"),
  },
  opsUser: {
    email: "benny@shamiri.institute",
    stateFile: path.join(__dirname, "./fixtures/operations-state.json"),
  },
};

/** A signed session cookie for the user, backed by a new row in `sessions`. */
export async function sessionCookieFor(email: string) {
  const user = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, email),
    columns: { id: true },
  });
  if (!user) throw new Error(`No user with email ${email}`);
  return createSessionCookie(user.id);
}

/**
 * A seeded user for a role, chosen from the database rather than from a fixed email, because the
 * seed reassigns the fixture accounts. Same picker the bench harness uses, so the tests and the
 * benchmark exercise the same accounts.
 */
export async function signInAs(context: BrowserContext, role: Role) {
  const user = await pickUser(role);
  await signInWithEmail(context, user.email);
  return user;
}

/**
 * SQL that holds when the implementer member `alias` can sign in as its role: the user has one
 * membership, so the session's active role is that one, and its organisation runs a hub in the
 * default project, without which sign-in fails with "No active membership".
 */
export function signableMember(alias = "m") {
  const member = sql.raw(alias);
  return sql`(select count(*) from implementer_members o where o.user_id = ${member}.user_id) = 1
    and exists (select 1 from hubs h join projects p on p.id = h.project_id
      where h.implementer_id = ${member}.implementer_id and p.is_default)`;
}

/**
 * The email of the user behind a profile (a supervisor, hub coordinator, ...). Only users with one
 * membership qualify, so the session's active role is the one asked for.
 */
export async function emailForProfile(identifier: string, role: Role) {
  const {
    rows: [row],
  } = await db.execute<{ email: string }>(sql`
    select u.email from implementer_members m
    join users u on u.id = m.user_id
    where m.identifier = ${identifier} and m.role = ${role} and u.email is not null
      and ${signableMember()}
    order by u.email
    limit 1`);
  return row?.email ?? null;
}

export async function signInWithEmail(context: BrowserContext, email: string) {
  await context.addCookies([await sessionCookieFor(email)]);
}
