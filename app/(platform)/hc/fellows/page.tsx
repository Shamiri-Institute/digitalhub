import { type AnyPgColumn } from "drizzle-orm/pg-core";
import { countDistinct, eq, inArray, isNull, sql } from "drizzle-orm";
import { Suspense } from "react";

import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import FellowsChartsWrapper from "#/app/(platform)/hc/fellows/components/fellows-charts-wrapper";
import MainFellowsDatatable from "#/app/(platform)/hc/fellows/components/main-fellows-datatable";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow, interventionGroup, weeklyFellowRatings } from "#/db/schema";

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
    db
      .select({
        id: fellow.id,
        fellowName: fellow.fellowName,
        fellowEmail: fellow.fellowEmail,
        gender: fellow.gender,
        dateOfBirth: fellow.dateOfBirth,
        idNumber: fellow.idNumber,
        county: fellow.county,
        subCounty: fellow.subCounty,
        mpesaName: fellow.mpesaName,
        mpesaNumber: fellow.mpesaNumber,
        cellNumber: fellow.cellNumber,
        supervisorId: fellow.supervisorId,
        droppedOut: fellow.droppedOut,
        groupCount: countDistinct(interventionGroup.id),
        averageRating: sql<
          number | null
        >`((avg(${weeklyFellowRatings.behaviourRating}) + avg(${weeklyFellowRatings.dressingAndGroomingRating}) + avg(${weeklyFellowRatings.programDeliveryRating}) + avg(${weeklyFellowRatings.punctualityRating})) / 4)::float8`,
      })
      .from(fellow)
      .leftJoin(weeklyFellowRatings, eq(fellow.id, weeklyFellowRatings.fellowId))
      .leftJoin(interventionGroup, eq(fellow.id, interventionGroup.leaderId))
      // The old raw query compared `hub_id = NULL` here, which matches nothing.
      .where(hubId === null ? sql`false` : eq(fellow.hubId, hubId))
      .groupBy(fellow.id),
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
