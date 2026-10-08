import { eq, inArray, sql } from "drizzle-orm";
import { signOut } from "next-auth/react";
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
import { fellow, weeklyFellowRatings } from "#/db/schema";

export default async function FellowPage() {
  const hc = await currentHubCoordinator();
  if (!hc) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }
  const hubId = hc.profile.assignedHubId;
  if (!hubId) {
    await signOut({ callbackUrl: "/login" });
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Fellows" />
        <Separator />

        <Suspense fallback={<GraphLoadingIndicator />}>
          <FellowsChartsWrapper coordinator={{ assignedHubId: hubId }} />
        </Suspense>
        <FellowsTable
          hubId={hubId}
          role={hc.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
        />
      </div>
      <PageFooter />
    </div>
  );
}

async function FellowsTable({ hubId, role }: { hubId: string; role: ImplementerRole }) {
  const hubFellowIds = db.select({ id: fellow.id }).from(fellow).where(eq(fellow.hubId, hubId));
  const ratingAverages = db
    .select({
      fellowId: weeklyFellowRatings.fellowId,
      averageRating: sql<
        number | null
      >`((avg(${weeklyFellowRatings.behaviourRating}) + avg(${weeklyFellowRatings.dressingAndGroomingRating}) + avg(${weeklyFellowRatings.programDeliveryRating}) + avg(${weeklyFellowRatings.punctualityRating})) / 4)::float8`.as(
        "average_rating",
      ),
    })
    .from(weeklyFellowRatings)
    .where(inArray(weeklyFellowRatings.fellowId, hubFellowIds))
    .groupBy(weeklyFellowRatings.fellowId)
    .as("rating_averages");

  const [fellowRows, complaints, groups, supervisors] = await Promise.all([
    db
      .select({
        id: fellow.id,
        fellowName: fellow.fellowName,
        fellowEmail: fellow.fellowEmail,
        gender: fellow.gender,
        county: fellow.county,
        subCounty: fellow.subCounty,
        cellNumber: fellow.cellNumber,
        supervisorId: fellow.supervisorId,
        droppedOut: fellow.droppedOut,
        averageRating: ratingAverages.averageRating,
      })
      .from(fellow)
      .leftJoin(ratingAverages, eq(fellow.id, ratingAverages.fellowId))
      .where(eq(fellow.hubId, hubId))
      .orderBy(fellow.fellowName, fellow.id),
    db.query.fellowComplaints.findMany({
      where: (c, { inArray }) => inArray(c.fellowId, hubFellowIds),
      columns: { id: true, fellowId: true, complaint: true, comments: true, createdAt: true },
      with: { user: { columns: { name: true } } },
      orderBy: (c, { desc }) => [desc(c.createdAt), desc(c.id)],
    }),
    db.query.interventionGroup.findMany({
      where: (g, { inArray }) => inArray(g.leaderId, hubFellowIds),
      columns: { id: true, leaderId: true, groupName: true, archivedAt: true },
      with: { school: { columns: { schoolName: true } } },
      orderBy: (g, { asc }) => [asc(g.groupName), asc(g.id)],
    }),
    db.query.supervisor.findMany({
      where: (s, { eq }) => eq(s.hubId, hubId),
      columns: { id: true, supervisorName: true },
      with: {
        fellows: {
          columns: { id: true, fellowName: true, droppedOut: true },
          orderBy: (f, { asc }) => [asc(f.fellowName), asc(f.id)],
        },
      },
      orderBy: (s, { asc }) => [asc(s.supervisorName), asc(s.id)],
    }),
  ]);

  const complaintsByFellow = Map.groupBy(complaints, (c) => c.fellowId);
  const groupsByLeader = Map.groupBy(groups, (g) => g.leaderId);
  const data = fellowRows.map((fellowRow) => {
    const fellowGroups = groupsByLeader.get(fellowRow.id) ?? [];
    return {
      ...fellowRow,
      groupCount: fellowGroups.length,
      complaints: complaintsByFellow.get(fellowRow.id) ?? [],
      groups: fellowGroups,
    };
  });

  return <MainFellowsDatatable fellows={data} supervisors={supervisors} role={role} />;
}
