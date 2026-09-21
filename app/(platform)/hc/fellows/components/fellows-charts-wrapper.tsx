import { and, count, eq, inArray } from "drizzle-orm";

import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import {
  fetchFellowDataCompletenessData,
  fetchFellowDropoutReasons,
  fetchFellowSessionRatingAverages,
} from "#/app/(platform)/hc/fellows/actions";
import FellowsCharts from "#/app/(platform)/hc/fellows/components/fellow-charts";
import { db } from "#/db/client";
import { interventionSession, school } from "#/db/schema";

export default async function FellowsChartsWrapper({
  coordinator,
}: {
  coordinator: {
    assignedHubId: string | null;
  };
}) {
  const fetchGraphData = async () => {
    if (!coordinator?.assignedHubId) {
      return null;
    }
    const hubId = coordinator.assignedHubId;

    const dropoutData = fetchFellowDropoutReasons(hubId);

    const fellowsDataCompletenessPercentage = fetchFellowDataCompletenessData(hubId);

    const fellowsSessionRatings = fetchFellowSessionRatingAverages(hubId);

    const fellowAttendanceData = db
      .select({
        sessionType: interventionSession.sessionType,
        count: count(interventionSession.sessionType),
      })
      .from(interventionSession)
      .where(
        and(
          inArray(
            interventionSession.schoolId,
            db.select({ id: school.id }).from(school).where(eq(school.hubId, hubId)),
          ),
          eq(interventionSession.occurred, true),
        ),
      )
      .groupBy(interventionSession.sessionType);

    const data = await Promise.all([
      dropoutData,
      fellowsDataCompletenessPercentage,
      fellowsSessionRatings,
      fellowAttendanceData,
    ]);

    return data;
  };

  const graphData = await fetchGraphData();

  if (!graphData) {
    return <GraphLoadingIndicator />;
  }

  const [
    dropoutData,
    fellowsDataCompletenessPercentage,
    fellowsSessionRatings,
    fellowAttendanceData,
  ] = graphData;

  return (
    <FellowsCharts
      attendanceData={fellowAttendanceData}
      dropoutData={dropoutData}
      fellowsDataCompletenessPercentage={fellowsDataCompletenessPercentage}
      fellowsSessionRatings={fellowsSessionRatings}
    />
  );
}
