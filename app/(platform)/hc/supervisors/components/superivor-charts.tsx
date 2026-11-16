import type {
  SessionRatingAverages,
  SupervisorAttendanceData,
  SupervisorDropoutReasonsGraphData,
  fetchSupervisorDataCompletenessData,
} from "#/app/(platform)/hc/supervisors/actions";
import { categoryColor, sessionLabel } from "#/components/charts/constants";
import {
  BarList,
  CompletionRing,
  LineChart,
  RingBreakdown,
} from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";
import { SUPERVISOR_DROP_OUT_REASONS } from "#/lib/app-constants/constants";

const RATING_SERIES = [
  { name: "Student behaviour", color: "var(--color-chart-1)" },
  { name: "Admin support", color: "var(--color-chart-2)" },
  { name: "Workload", color: "var(--color-chart-3)" },
];

export default function SupervisorCharts({
  attendanceData,
  dropoutData,
  supervisorDataCompletenessPercentage,
  supervisorsSessionRatings,
}: {
  attendanceData: SupervisorAttendanceData[];
  dropoutData: SupervisorDropoutReasonsGraphData[];
  supervisorDataCompletenessPercentage: Awaited<
    ReturnType<typeof fetchSupervisorDataCompletenessData>
  >;
  supervisorsSessionRatings: SessionRatingAverages[];
}) {
  const completedPercentage = supervisorDataCompletenessPercentage.find(
    ({ name }) => name === "actual",
  )?.value;

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Attendances">
        {attendanceData.length ? (
          <BarList
            label="Sessions attended, by supervisor"
            rows={attendanceData
              .map(({ supervisor_name, attended }) => ({
                name: supervisor_name,
                value: Number(attended),
              }))
              .toSorted((first, second) => second.value - first.value)}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="Drop out reasons">
        {dropoutData.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Supervisors dropped out"
            slices={dropoutData
              .map(({ name, value }) => ({
                name,
                value: Number(value),
                color: categoryColor(name, SUPERVISOR_DROP_OUT_REASONS),
              }))
              .toSorted((first, second) => second.value - first.value)}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="Supervisor information completion">
        {completedPercentage === undefined ? null : (
          <CompletionRing
            label="Supervisor information complete"
            percentage={completedPercentage}
          />
        )}
      </ChartCard>
      <ChartCard title="Ratings">
        {supervisorsSessionRatings.length ? (
          <LineChart
            label="Average session ratings, by session"
            series={RATING_SERIES}
            minimumTop={5}
            categories={supervisorsSessionRatings.map((rating) => ({
              name: sessionLabel(rating.session_type),
              values: [rating.student_behaviour, rating.admin_support, rating.workload],
            }))}
          />
        ) : null}
      </ChartCard>
    </div>
  );
}
