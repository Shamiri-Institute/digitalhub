import { Prisma } from "@prisma/client";

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
export function hubScope(scope: ClinicalScope, alias: string) {
  const col = Prisma.raw(`${alias}.hub_id`);
  if ("projectId" in scope) {
    return {
      join: Prisma.sql`JOIN hubs h ON ${col} = h.id`,
      where: Prisma.sql`h."project_id" = ${scope.projectId}`,
    };
  }
  return {
    join: Prisma.empty,
    where: Prisma.sql`${col} = ${scope.hubId}`,
  };
}
