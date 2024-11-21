import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import {
  fetchFellowDataCompletenessData,
  fetchFellowDropoutReasons,
  fetchFellowSessionRatingAverages,
} from "#/app/(platform)/hc/fellows/actions";
import FellowsCharts from "#/app/(platform)/hc/fellows/components/fellow-charts";
import { db } from "#/lib/db";

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

    const dropoutData = fetchFellowDropoutReasons(coordinator.assignedHubId);

    const fellowsDataCompletenessPercentage = fetchFellowDataCompletenessData(
      coordinator?.assignedHubId,
    );

    const fellowsSessionRatings = fetchFellowSessionRatingAverages(
      coordinator?.assignedHubId as string,
    );

    const fellowAttendanceData = db.interventionSession.groupBy({
      by: ["sessionType"],
      where: {
        AND: [
          {
            school: {
              hubId: coordinator?.assignedHubId,
            },
          },
          {
            occurred: true,
          },
        ],
      },
      _count: {
        sessionType: true,
      },
    });

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
