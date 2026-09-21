import { type AnyPgColumn } from "drizzle-orm/pg-core";
import { eq, inArray, isNull, sql } from "drizzle-orm";
import { Suspense } from "react";

import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import type { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import FellowsChartsWrapper from "#/app/(platform)/hc/fellows/components/fellows-charts-wrapper";
import MainFellowsDatatable from "#/app/(platform)/hc/fellows/components/main-fellows-datatable";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db, queryRaw } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow } from "#/db/schema";

export default async function FellowPage() {
  const hc = await currentHubCoordinator();
  if (!hc) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }
  const hubId = hc.profile.assignedHubId;
  // Prisma matched NULL for a null hub id; keep that.
  const inHub = (col: AnyPgColumn) => (hubId === null ? isNull(col) : eq(col, hubId));
  const hubFellowIds = db.select({ id: fellow.id }).from(fellow).where(inHub(fellow.hubId));

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
          LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
          LEFT JOIN intervention_groups ig ON f.id = ig.leader_id
      WHERE f.hub_id =${hubId}
      GROUP BY
        f.id
  `),
    db.query.fellowComplaints.findMany({
      where: (c, { inArray }) => inArray(c.fellowId, hubFellowIds),
      with: { user: true },
    }),
    db.query.interventionGroup.findMany({
      where: (g, { inArray }) => inArray(g.leaderId, hubFellowIds),
      with: { school: true },
    }),
  ]).then((values) => {
    return values[0].map((fellowRow) => {
      return {
        ...fellowRow,
        groupCount: Number(fellowRow.groupCount),
        averageRating:
          fellowRow.averageRating !== null && fellowRow.averageRating !== undefined
            ? Number(fellowRow.averageRating)
            : null,
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
    where: (s) => inHub(s.hubId),
    with: { fellows: true },
  });

  const weeklyFellowEvaluations = await db.query.weeklyFellowRatings.findMany({
    where: (w) => inArray(w.fellowId, hubFellowIds),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Fellows" />
        <Separator />

        <Suspense fallback={<GraphLoadingIndicator />}>
          <FellowsChartsWrapper
            coordinator={{ assignedHubId: hc.profile?.assignedHubId ?? null }}
          />
        </Suspense>
        <MainFellowsDatatable
          fellows={data}
          supervisors={supervisors}
          weeklyEvaluations={weeklyFellowEvaluations}
          role={hc.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
        />
      </div>
      <PageFooter />
    </div>
  );
}
