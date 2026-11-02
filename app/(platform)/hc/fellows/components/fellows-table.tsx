import { eq, inArray, sql } from "drizzle-orm";

import MainFellowsDatatable from "#/app/(platform)/hc/fellows/components/main-fellows-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { fellow, weeklyFellowRatings } from "#/db/schema";

export default async function FellowsTable({
  hubId,
  role,
  title,
  description,
}: {
  hubId: string;
  role: ImplementerRole;
  title?: string;
  description?: string;
}) {
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

  return (
    <MainFellowsDatatable
      fellows={data}
      supervisors={supervisors}
      role={role}
      title={title}
      description={description}
    />
  );
}
