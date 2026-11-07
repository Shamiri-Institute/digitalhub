import { notFound } from "next/navigation";

import { ScheduleCalendar } from "#/components/common/session/schedule-calendar";
import { ImplementerRole } from "#/db/enums";
import { fetchHubFellowRatings } from "#/lib/actions/schedule-data";
import { loadScheduleSessions, type ScheduleSearchParams } from "#/lib/schedule-sessions";
import { fetchAdminHub } from "../../queries";

export default async function HubSessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ hubId: string }>;
  searchParams: ScheduleSearchParams;
}) {
  const { hubId } = await params;
  const hub = await fetchAdminHub(hubId);
  if (!hub) {
    notFound();
  }
  const [schedule, fellowRatings] = await Promise.all([
    loadScheduleSessions(searchParams, ImplementerRole.ADMIN, hub.id),
    fetchHubFellowRatings(hub.id),
  ]);

  return (
    <ScheduleCalendar
      aria-label={`${hub.hubName} session schedule`}
      sessions={schedule.sessions}
      timeZone={schedule.timeZone}
      defaultMode={schedule.defaultMode}
      fellowRatings={fellowRatings.map((rating) => ({
        ...rating,
        averageRating: Number(rating.averageRating),
      }))}
      role={ImplementerRole.ADMIN}
    />
  );
}
