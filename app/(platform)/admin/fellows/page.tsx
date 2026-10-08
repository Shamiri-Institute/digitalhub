import { and, countDistinct, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import MainFellowsDatatable from "#/app/(platform)/hc/fellows/components/main-fellows-datatable";
import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow, hub, interventionGroup, weeklyFellowRatings } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";

export default async function FellowPage() {
  const admin = await currentAdminUser();
  if (!admin) {
    redirect("/login");
  }
  const activeMembership = admin?.session?.user.activeMembership;
  const implementerId = activeMembership?.implementerId;
  const projectId = await getActiveProjectId();

  const projectHubIds = db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId));
  const projectFellowIds = db
    .select({ id: fellow.id })
    .from(fellow)
    .where(
      and(
        implementerId === undefined ? undefined : eq(fellow.implementerId, implementerId),
        inArray(fellow.hubId, projectHubIds),
      ),
    );

  const listedFellow = and(
    or(eq(hub.projectId, projectId), isNull(fellow.hubId)),
    implementerId === undefined ? sql`false` : eq(fellow.implementerId, implementerId),
  );
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
    .where(
      inArray(
        weeklyFellowRatings.fellowId,
        db
          .select({ id: fellow.id })
          .from(fellow)
          .leftJoin(hub, eq(fellow.hubId, hub.id))
          .where(listedFellow),
      ),
    )
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
        groupCount: countDistinct(interventionGroup.id),
        averageRating: ratingAverages.averageRating,
      })
      .from(fellow)
      .leftJoin(hub, eq(fellow.hubId, hub.id))
      .leftJoin(ratingAverages, eq(fellow.id, ratingAverages.fellowId))
      .leftJoin(interventionGroup, eq(fellow.id, interventionGroup.leaderId))
      .where(listedFellow)
      .groupBy(fellow.id, ratingAverages.averageRating)
      .orderBy(fellow.fellowName, fellow.id),
    db.query.fellowComplaints.findMany({
      where: (c, { inArray }) => inArray(c.fellowId, projectFellowIds),
      columns: { id: true, fellowId: true, complaint: true, comments: true, createdAt: true },
      with: { user: { columns: { name: true } } },
    }),
    db.query.interventionGroup.findMany({
      where: (g, { inArray }) => inArray(g.leaderId, projectFellowIds),
      columns: { id: true, leaderId: true, groupName: true, archivedAt: true },
      with: { school: { columns: { schoolName: true } } },
    }),
    db.query.supervisor.findMany({
      where: (s, { and, eq, inArray }) =>
        and(
          implementerId === undefined ? undefined : eq(s.implementerId, implementerId),
          inArray(s.hubId, projectHubIds),
        ),
      columns: { id: true, supervisorName: true },
      with: { fellows: { columns: { id: true, fellowName: true, droppedOut: true } } },
    }),
  ]);

  const complaintsByFellow = Map.groupBy(complaints, (c) => c.fellowId);
  const groupsByLeader = Map.groupBy(groups, (g) => g.leaderId);
  const data = fellowRows.map((fellowRow) => ({
    ...fellowRow,
    complaints: complaintsByFellow.get(fellowRow.id) ?? [],
    groups: groupsByLeader.get(fellowRow.id) ?? [],
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Fellows" />
        <Separator />
        <MainFellowsDatatable
          fellows={data}
          supervisors={supervisors}
          role={activeMembership?.role ?? ImplementerRole.ADMIN}
        />
      </div>
      <PageFooter />
    </div>
  );
}
