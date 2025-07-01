import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import {
  fetchSupervisorAttendanceData,
  fetchSupervisorDataCompletenessData,
  fetchSupervisorDropoutReasons,
  fetchSupervisorSessionRatingAverages,
} from "#/app/(platform)/hc/supervisors/actions";
import SupervisorCharts from "#/app/(platform)/hc/supervisors/components/superivor-charts";

export default async function SupervisorChartsWrapper({
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

    const dropoutData = await fetchSupervisorDropoutReasons(coordinator.assignedHubId);

    const supervisorDataCompletenessPercentage = fetchSupervisorDataCompletenessData(
      coordinator?.assignedHubId,
    );

    const supervisorsSessionRatings = fetchSupervisorSessionRatingAverages(
      coordinator?.assignedHubId as string,
    );

    const supervisorAttendanceData = fetchSupervisorAttendanceData(
      coordinator?.assignedHubId as string,
    );

    const data = await Promise.all([
      dropoutData,
      supervisorDataCompletenessPercentage,
      supervisorsSessionRatings,
      supervisorAttendanceData,
    ]);

    return data;
  };

  const graphData = await fetchGraphData();

  if (!graphData) {
    return <GraphLoadingIndicator />;
  }

  const [
    dropoutData,
    supervisorDataCompletenessPercentage,
    supervisorsSessionRatings,
    supervisorAttendanceData,
  ] = graphData;

  return (
    <SupervisorCharts
      attendanceData={supervisorAttendanceData}
      dropoutData={dropoutData}
      supervisorDataCompletenessPercentage={supervisorDataCompletenessPercentage}
      supervisorsSessionRatings={supervisorsSessionRatings}
    />
  );
}
