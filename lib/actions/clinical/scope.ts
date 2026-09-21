import { type SQL, sql } from "drizzle-orm";

/**
 * The clinical dashboards exist for two roles with different data scope:
 * a clinical lead sees one hub, the clinical team sees the whole project.
 * Query cores in this directory take a ClinicalScope and build the same
 * SQL either way; each role's actions file authenticates with its own
 * role check and passes its scope.
 */
export type ClinicalScope = { hubId: string | null } | { projectId: string };

/**
 * Join/filter pair that scopes a table carrying a hub_id column (aliased)
 * to the given scope. Hub scope filters the column directly; project scope
 * joins up to hubs and filters on the project.
 */
export function hubScope(scope: ClinicalScope, alias: string): { join: SQL; where: SQL } {
  const col = sql.raw(`${alias}.hub_id`);
  if ("projectId" in scope) {
    return {
      join: sql`JOIN hubs h ON ${col} = h.id`,
      where: sql`h."project_id" = ${scope.projectId}`,
    };
  }
  return {
    join: sql.empty(),
    where: sql`${col} = ${scope.hubId}`,
  };
}
