import { categoryColor, sessionLabel } from "#/components/charts/constants";
import { LineChart, RingChart, StackedColumnChart } from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";
import { SCHOOL_DROPOUT_REASONS } from "#/lib/app-constants/constants";
import type {
  DropoutReasonsGraphData,
  fetchSchoolDataCompletenessData,
  SchoolAttendances,
  SessionRatingAverages,
} from "../actions";

const ATTENDANCE_SERIES = [
  { name: "Attendance marked", color: "var(--color-primary)" },
  { name: "Attendance unmarked", color: "var(--color-info-border)" },
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
  const dropoutSlices = dropoutData
    .map(({ name, value }) => ({
      name,
      value,
      color: categoryColor(name, SCHOOL_DROPOUT_REASONS),
    }))
    .toSorted((first, second) => second.value - first.value);
  const droppedOutSchoolCount = dropoutSlices.reduce((sum, { value }) => sum + value, 0);
  const completedPercentage = schoolDataCompletenessData.find(
    ({ name }) => name === "actual",
  )?.value;

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Session progress">
        {schoolAttendances.length ? (
          <StackedColumnChart
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
        {droppedOutSchoolCount > 0 ? (
          <div className="flex h-full flex-col items-center gap-3">
            <RingChart
              label={`${droppedOutSchoolCount} schools dropped out`}
              slices={dropoutSlices}
              sizeClassName="size-28"
              middle={
                <span className="text-2xl font-semibold leading-8">{droppedOutSchoolCount}</span>
              }
            />
            <ul className="min-h-0 w-full space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {dropoutSlices.map(({ name, value, color }) => (
                <li key={name} className="flex items-center gap-1.5">
                  <svg aria-hidden className="size-2.5 shrink-0" viewBox="0 0 10 10">
                    <rect width={10} height={10} rx={2} fill={color} />
                  </svg>
                  <span className="min-w-0 flex-1 truncate first-letter:uppercase" title={name}>
                    {name}
                  </span>
                  <span className="font-medium text-foreground tabular-nums">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ChartCard>
      <ChartCard title="School information completion">
        {completedPercentage !== undefined ? (
          <div className="flex h-full items-center justify-center">
            <RingChart
              label={`School information ${completedPercentage}% complete`}
              sizeClassName="size-40"
              slices={[
                {
                  name: "Complete",
                  value: completedPercentage,
                  color: "var(--color-primary)",
                },
                {
                  name: "Missing",
                  value: 100 - completedPercentage,
                  color: "var(--color-info-bg)",
                },
              ]}
              middle={
                <span className="text-2xl font-semibold leading-8">{completedPercentage}%</span>
              }
            />
          </div>
        ) : null}
      </ChartCard>
      <ChartCard title="Ratings">
        {sessionRatingsData.length ? (
          <LineChart
            label="Average session ratings, by session"
            series={RATING_SERIES}
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
