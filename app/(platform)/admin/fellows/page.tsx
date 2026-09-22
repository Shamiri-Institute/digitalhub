import { and, countDistinct, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { signOut } from "next-auth/react";

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
    await signOut({ callbackUrl: "/login" });
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
      .leftJoin(hub, eq(fellow.hubId, hub.id))
      .leftJoin(weeklyFellowRatings, eq(fellow.id, weeklyFellowRatings.fellowId))
      .leftJoin(interventionGroup, eq(fellow.id, interventionGroup.leaderId))
      .where(
        and(
          or(eq(hub.projectId, projectId), isNull(fellow.hubId)),
          implementerId === undefined ? sql`false` : eq(fellow.implementerId, implementerId),
        ),
      )
      .groupBy(fellow.id),
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
