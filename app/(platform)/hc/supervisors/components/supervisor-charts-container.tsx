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
  const fetchGraphData = () => {
    if (!coordinator?.assignedHubId) {
      return null;
    }

    return Promise.all([
      fetchSupervisorDropoutReasons(),
      fetchSupervisorDataCompletenessData(),
      fetchSupervisorSessionRatingAverages(),
      fetchSupervisorAttendanceData(),
    ]);
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
