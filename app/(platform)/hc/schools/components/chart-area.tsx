import { categoryColor, sessionLabel } from "#/components/charts/constants";
import {
  ColumnChart,
  CompletionRing,
  LineChart,
  RingBreakdown,
} from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";
import { SCHOOL_DROPOUT_REASONS } from "#/lib/app-constants/constants";
import type {
  DropoutReasonsGraphData,
  fetchSchoolDataCompletenessData,
  SchoolAttendances,
  SessionRatingAverages,
} from "../actions";

const ATTENDANCE_SERIES = [
  { name: "Attendance marked", color: "var(--color-primary)", stack: "schools" },
  { name: "Attendance unmarked", color: "var(--color-info-border)", stack: "schools" },
];

const RATING_SERIES = [
  { name: "Student behaviour", color: "var(--color-chart-1)" },
  { name: "Admin support", color: "var(--color-chart-2)" },
  { name: "Workload", color: "var(--color-chart-3)" },
];

export default function ChartArea({
  dropoutData,
  schoolDataCompletenessData,
  sessionRatingsData,
  schoolAttendances,
}: {
  dropoutData: DropoutReasonsGraphData[];
  schoolDataCompletenessData: Awaited<ReturnType<typeof fetchSchoolDataCompletenessData>>;
  schoolAttendances: SchoolAttendances[];
  sessionRatingsData: SessionRatingAverages[];
}) {
  const completedPercentage = schoolDataCompletenessData.find(
    ({ name }) => name === "actual",
  )?.value;

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Session progress">
        {schoolAttendances.length ? (
          <ColumnChart
            label="Schools with attendance marked, by session"
            series={ATTENDANCE_SERIES}
            categories={schoolAttendances.map((attendance) => ({
              name: sessionLabel(attendance.session_type),
              values: [attendance.count_attendance_marked, attendance.count_attendance_unmarked],
            }))}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="Drop out reasons">
        {dropoutData.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Schools dropped out"
            slices={dropoutData
              .map(({ name, value }) => ({
                name,
                value,
                color: categoryColor(name, SCHOOL_DROPOUT_REASONS),
              }))
              .toSorted((first, second) => second.value - first.value)}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="School information completion">
        {completedPercentage === undefined ? null : (
          <CompletionRing label="School information complete" percentage={completedPercentage} />
        )}
      </ChartCard>
      <ChartCard title="Ratings">
        {sessionRatingsData.length ? (
          <LineChart
            label="Average session ratings, by session"
            series={RATING_SERIES}
            minimumTop={5}
            categories={sessionRatingsData.map((rating) => ({
              name: sessionLabel(rating.session_type),
              values: [
                Number(rating.student_behavior) || 0,
                Number(rating.admin_support) || 0,
                Number(rating.workload) || 0,
              ],
            }))}
          />
        ) : null}
      </ChartCard>
    </div>
  );
}
