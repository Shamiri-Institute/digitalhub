import { readdirSync } from "node:fs";
import path from "node:path";

import { query } from "./db";

export type Role =
  | "HUB_COORDINATOR"
  | "SUPERVISOR"
  | "FELLOW"
  | "CLINICAL_LEAD"
  | "CLINICAL_TEAM"
  | "OPERATIONS"
  | "ADMIN";

export type BenchUser = { id: string; email: string; identifier: string | null };
export type Route = { role: Role; path: string };

const PREFIX_ROLE: Record<string, Role> = {
  hc: "HUB_COORDINATOR",
  sc: "SUPERVISOR",
  fel: "FELLOW",
  cl: "CLINICAL_LEAD",
  ct: "CLINICAL_TEAM",
  ops: "OPERATIONS",
  admin: "ADMIN",
};

/** Extra condition a membership must satisfy so that the role's pages have data behind them. */
const PROFILE_FILTER: Record<Role, string> = {
  HUB_COORDINATOR: `exists (select 1 from hub_coordinators hc join schools s on s.hub_id = hc.assigned_hub_id
      where hc.id = m.identifier and hc.archived_at is null and s.archived_at is null)`,
  SUPERVISOR: `exists (select 1 from supervisors sv join schools s on s.hub_id = sv.hub_id
      where sv.id = m.identifier and sv.archived_at is null and s.archived_at is null)`,
  FELLOW: `exists (select 1 from fellows f join schools s on s.hub_id = f.hub_id
      where f.id = m.identifier and f.archived_at is null and s.archived_at is null)`,
  CLINICAL_LEAD: `exists (select 1 from clinical_leads cl where cl.id = m.identifier)`,
  CLINICAL_TEAM: `exists (select 1 from clinical_teams ct where ct.id = m.identifier)`,
  OPERATIONS: `exists (select 1 from ops_users o where o.id = m.identifier)`,
  ADMIN: `true`,
};

/** First school (by visible id) the role's profile can open. `$1` is the membership identifier. */
const SCHOOL_FOR_ROLE: Partial<Record<Role, string>> = {
  HUB_COORDINATOR: `select s.visible_id from schools s join hub_coordinators hc on hc.assigned_hub_id = s.hub_id
      where hc.id = $1 and s.archived_at is null order by s.visible_id limit 1`,
  SUPERVISOR: `select s.visible_id from schools s join supervisors sv on sv.hub_id = s.hub_id
      where sv.id = $1 and s.archived_at is null
      order by (s.assigned_supervisor_id = $1) desc nulls last, s.visible_id limit 1`,
  FELLOW: `select s.visible_id from schools s join fellows f on f.hub_id = s.hub_id
      where f.id = $1 and s.archived_at is null order by s.visible_id limit 1`,
  ADMIN: `select visible_id from schools where archived_at is null order by visible_id limit 1`,
};

/**
 * Deterministic user per role: not archived, exactly one membership (so the active
 * membership is unambiguous), implementer active in the default project, profile has data.
 */
export async function pickUser(role: Role): Promise<BenchUser> {
  const rows = await query<BenchUser>(
    `select u.id, u.email, m.identifier
     from users u
     join implementer_members m on m.user_id = u.id
     join implementers i on i.id = m.implementer_id
     where u.archived_at is null
       and m.role::text = $1
       and (select count(*) from implementer_members m2 where m2.user_id = u.id) = 1
       and exists (select 1 from hubs h join projects p on p.id = h.project_id
                   where h.implementer_id = i.id and p.is_default)
       and ${PROFILE_FILTER[role]}
     order by u.email
     limit 1`,
    [role],
  );
  const user = rows[0];
  if (!user) throw new Error(`No seeded user found for role ${role}`);
  return user;
}

async function pickSchoolVisibleId(role: Role, identifier: string | null) {
  const sql = SCHOOL_FOR_ROLE[role];
  if (!sql) return null;
  const rows = await query<{ visible_id: string }>(sql, role === "ADMIN" ? [] : [identifier]);
  return rows[0]?.visible_id ?? null;
}

/** Every `app/(platform)/**\/page.tsx` as a URL path, grouped by the role prefix. */
export function discoverPagePaths(): Route[] {
  const root = path.join(process.cwd(), "app", "(platform)");
  const routes: Route[] = [];
  for (const entry of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    if (!entry.endsWith("page.tsx")) continue;
    const segments = entry
      .split(path.sep)
      .slice(0, -1)
      .filter((s) => !s.startsWith("("));
    const role = PREFIX_ROLE[segments[0] ?? ""];
    if (!role) continue;
    routes.push({ role, path: `/${segments.join("/")}` });
  }
  return routes.toSorted((a, b) => a.path.localeCompare(b.path));
}

export async function resolveRoutes(): Promise<{
  users: Record<Role, BenchUser>;
  routes: Route[];
}> {
  const roles = [...new Set(discoverPagePaths().map((r) => r.role))];
  const users = {} as Record<Role, BenchUser>;
  const schools = {} as Record<Role, string | null>;
  for (const role of roles) {
    users[role] = await pickUser(role);
    schools[role] = await pickSchoolVisibleId(role, users[role].identifier);
  }

  const routes: Route[] = [];
  for (const route of discoverPagePaths()) {
    if (route.path.includes("[visibleId]")) {
      const visibleId = schools[route.role];
      if (!visibleId) {
        console.warn(`skip ${route.path}: no school for ${route.role}`);
        continue;
      }
      routes.push({ ...route, path: route.path.replace("[visibleId]", visibleId) });
    } else if (route.path.includes("[")) {
      console.warn(`skip ${route.path}: unresolved dynamic segment`);
    } else {
      routes.push(route);
    }
  }
  return { users, routes };
}
