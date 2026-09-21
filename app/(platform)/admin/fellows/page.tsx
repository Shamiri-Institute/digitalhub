import { and, eq, inArray, sql } from "drizzle-orm";
import { signOut } from "next-auth/react";

import type { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import MainFellowsDatatable from "#/app/(platform)/hc/fellows/components/main-fellows-datatable";
import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db, queryRaw } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow, hub } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";

export default async function FellowPage() {
  const admin = await currentAdminUser();
  if (!admin) {
    await signOut({ callbackUrl: "/login" });
  }
  const activeMembership = admin?.session?.user.activeMembership;
  const implementerId = activeMembership?.implementerId;
  const projectId = await getActiveProjectId();

  const projectHubIds = db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId));
  // Fellows of this implementer in the active project. Prisma dropped the implementer filter
  // when the id was undefined; keep that.
  const projectFellowIds = db
    .select({ id: fellow.id })
    .from(fellow)
    .where(
      and(
        implementerId === undefined ? undefined : eq(fellow.implementerId, implementerId),
        inArray(fellow.hubId, projectHubIds),
      ),
    );

  const data = await Promise.all([
    queryRaw<Omit<MainFellowTableData, "complaints">>(sql`
      SELECT
        f.id,
        f.fellow_name AS "fellowName",
        f.fellow_email AS "fellowEmail",
        f.gender AS "gender",
        f.date_of_birth AS "dateOfBirth",
        f.id_number AS "idNumber",
        f.county AS "county",
        f.sub_county AS "subCounty",
        f.mpesa_name AS "mpesaName",
        f.mpesa_number AS "mpesaNumber",
        f.cell_number AS "cellNumber",
        f.supervisor_id AS "supervisorId",
        f.date_of_birth as "dateOfBirth",
        f.id_number as "idNumber",
        f.dropped_out AS "droppedOut",
        COUNT(DISTINCT ig.id) AS "groupCount",
        ((AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4)::float8 AS "averageRating"
      FROM
        fellows f
          LEFT JOIN hubs h ON f.hub_id = h.id
          LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
          LEFT JOIN intervention_groups ig ON f.id = ig.leader_id
      WHERE (h.project_id = ${projectId} OR f.hub_id IS NULL)
        AND f.implementer_id = ${implementerId}
      GROUP BY
        f.id
    `),
    db.query.fellowComplaints.findMany({
      where: (c, { inArray }) => inArray(c.fellowId, projectFellowIds),
      with: { user: true },
    }),
    db.query.interventionGroup.findMany({
      where: (g, { inArray }) => inArray(g.leaderId, projectFellowIds),
      with: { school: true },
    }),
  ]).then((values) => {
    return values[0].map((fellowRow) => {
      return {
        ...fellowRow,
        complaints: values[1].filter((_complaints) => {
          return _complaints.fellowId === fellowRow.id;
        }),
        groups: values[2].filter((_groups) => {
          return _groups.leaderId === fellowRow.id;
        }),
      };
    });
  });

  const supervisors = await db.query.supervisor.findMany({
    where: (s, { and, eq, inArray }) =>
      and(
        implementerId === undefined ? undefined : eq(s.implementerId, implementerId),
        inArray(s.hubId, projectHubIds),
      ),
    with: { fellows: true },
  });

  const weeklyFellowEvaluations = await db.query.weeklyFellowRatings.findMany({
    where: (w, { inArray }) => inArray(w.fellowId, projectFellowIds),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Fellows" />
        <Separator />
        <MainFellowsDatatable
          fellows={data}
          supervisors={supervisors}
          weeklyEvaluations={weeklyFellowEvaluations}
          role={activeMembership?.role ?? ImplementerRole.ADMIN}
        />
      </div>
      <PageFooter />
    </div>
  );
}
