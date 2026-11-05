import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, project, school, supervisor } from "#/db/schema";

export type MonitoringViewer =
  | { role: "hub-coordinator"; hubId: string; hubName: string; projectId: string }
  | {
      role: "supervisor";
      hubId: string;
      hubName: string;
      projectId: string;
      supervisorId: string;
      supervisorName: string;
    };

export type FilterOption = { id: string; name: string };

export type MonitoringSearchParams = {
  tab?: string;
  school?: string;
  supervisor?: string;
  fellow?: string;
};

async function schoolOptionsForViewer(viewer: MonitoringViewer): Promise<FilterOption[]> {
  return db
    .select({ id: school.id, name: school.schoolName })
    .from(school)
    .where(and(eq(school.hubId, viewer.hubId), isNull(school.archivedAt)))
    .orderBy(asc(school.schoolName));
}

async function supervisorOptionsForViewer(viewer: MonitoringViewer): Promise<FilterOption[]> {
  if (viewer.role === "supervisor") return [];
  const hubSupervisors = await db
    .select({ id: supervisor.id, name: supervisor.supervisorName })
    .from(supervisor)
    .where(
      and(
        eq(supervisor.hubId, viewer.hubId),
        isNull(supervisor.archivedAt),
        isNotNull(supervisor.supervisorName),
      ),
    )
    .orderBy(asc(supervisor.supervisorName));
  return hubSupervisors.map(({ id, name }) => ({ id, name: name ?? "" }));
}

async function fellowOptionsForViewer(viewer: MonitoringViewer): Promise<FilterOption[]> {
  const viewerFellows = await db
    .select({ id: fellow.id, name: fellow.fellowName })
    .from(fellow)
    .where(
      and(eq(fellow.hubId, viewer.hubId), isNull(fellow.archivedAt), isNotNull(fellow.fellowName)),
    )
    .orderBy(asc(fellow.fellowName));
  return viewerFellows.map(({ id, name }) => ({ id, name: name ?? "" }));
}

function selectedIfOffered(options: FilterOption[], requestedId: string | undefined) {
  return options.some((option) => option.id === requestedId) ? (requestedId ?? null) : null;
}

/**
 * URL values only narrow what the viewer may already see: an id outside the viewer's hub is ignored.
 * A supervisor sees the hub, so their own rows are not a filter here: see `supervisorCardScope`.
 */
export async function resolveMonitoringFilters(
  viewer: MonitoringViewer,
  searchParams: MonitoringSearchParams,
  timeZone: string,
) {
  const [schoolOptions, supervisorOptions, fellowOptions, viewerProject] = await Promise.all([
    schoolOptionsForViewer(viewer),
    supervisorOptionsForViewer(viewer),
    fellowOptionsForViewer(viewer),
    db.query.project.findFirst({
      where: eq(project.id, viewer.projectId),
      columns: { visibleId: true },
    }),
  ]);

  return {
    filters: {
      projectId: viewer.projectId,
      hubId: viewer.hubId,
      schoolId: selectedIfOffered(schoolOptions, searchParams.school),
      supervisorId: selectedIfOffered(supervisorOptions, searchParams.supervisor),
      fellowId: selectedIfOffered(fellowOptions, searchParams.fellow),
      timeZone,
    },
    options: { schoolOptions, supervisorOptions, fellowOptions },
    projectVisibleId: viewerProject?.visibleId ?? null,
  };
}
