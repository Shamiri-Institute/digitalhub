import type { interventionSession } from "#/db/schema";
import type {
  FellowDropoutReasonsGraphData,
  FellowSessionRatingAverages,
  fetchFellowDataCompletenessData,
} from "#/app/(platform)/hc/fellows/actions";
import { categoryColor, sessionLabel } from "#/components/charts/constants";
import {
  ColumnChart,
  CompletionRing,
  LineChart,
  RingBreakdown,
} from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";
import { FELLOW_DROP_OUT_REASONS } from "#/lib/app-constants/constants";

const RATING_SERIES = [
  { name: "Behaviour", color: "var(--color-chart-1)" },
  { name: "Program delivery", color: "var(--color-chart-2)" },
  { name: "Dressing and grooming", color: "var(--color-chart-3)" },
  { name: "Punctuality", color: "var(--color-chart-4)" },
];

/** "November Week 45" reads as "Wk 45" on the axis; the tooltip keeps the month. */
function weekLabel(sessionDate: string) {
  const week = /Week (\d+)$/.exec(sessionDate)?.[1];
  return week ? `Wk ${week}` : sessionDate;
}

export default function FellowsCharts({
  attendanceData,
  dropoutData,
  fellowsDataCompletenessPercentage,
  fellowsSessionRatings,
}: {
  attendanceData: {
    sessionType: (typeof interventionSession.$inferSelect)["sessionType"];
    count: number;
  }[];
  dropoutData: FellowDropoutReasonsGraphData[];
  fellowsDataCompletenessPercentage: Awaited<ReturnType<typeof fetchFellowDataCompletenessData>>;
  fellowsSessionRatings: FellowSessionRatingAverages[];
}) {
  const interventionAttendance = attendanceData
    .flatMap(({ sessionType, count }) =>
      sessionType && /^s[0-4]$/i.test(sessionType) ? [{ sessionType, count }] : [],
    )
    .toSorted((first, second) => first.sessionType.localeCompare(second.sessionType));
  const completedPercentage = fellowsDataCompletenessPercentage.find(
    ({ name }) => name === "actual",
  )?.value;

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Attendances">
        {interventionAttendance.length ? (
          <ColumnChart
            label="Attendances, by session"
            series={[{ name: "Attendance count", color: "var(--color-primary)" }]}
            categories={interventionAttendance.map(({ sessionType, count }) => ({
              name: sessionLabel(sessionType),
              values: [count],
            }))}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="Drop out reasons">
        {dropoutData.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Fellows dropped out"
            slices={dropoutData
              .map(({ name, value }) => ({
                name,
                value: Number(value),
                color: categoryColor(name, FELLOW_DROP_OUT_REASONS),
              }))
              .toSorted((first, second) => second.value - first.value)}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="Fellows information completion">
        {completedPercentage === undefined ? null : (
          <CompletionRing label="Fellow information complete" percentage={completedPercentage} />
        )}
      </ChartCard>
      <ChartCard title="Ratings">
        {fellowsSessionRatings.length ? (
          <LineChart
            label="Average weekly fellow ratings"
            series={RATING_SERIES}
            minimumTop={5}
            categories={fellowsSessionRatings.map((rating) => ({
              name: rating.session_date,
              label: weekLabel(rating.session_date),
              values: [
                rating.behaviour_rating,
                rating.program_delivery_rating,
                rating.dressing_and_grooming_rating,
                rating.punctuality_rating,
              ],
            }))}
          />
        ) : null}
      </ChartCard>
    </div>
  );
}
