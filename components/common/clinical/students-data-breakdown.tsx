import { sessionLabel, seriesColor } from "#/components/charts/constants";
import {
  ColumnChart,
  CompletionRing,
  LineChart,
  RingBreakdown,
} from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";

export default function StudentsDataBreakdown({
  attendanceData,
  dropoutData,
  completionData,
  ratingsData,
}: {
  attendanceData: { name: string; value: number }[];
  dropoutData: { name: string; value: number }[];
  completionData: { name: string; value: number }[];
  ratingsData: {
    session: string;
    value: number;
  }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 py-2 sm:grid-cols-2 xl:grid-cols-4">
      <ChartCard title="Attendance">
        {attendanceData.length ? (
          <ColumnChart
            label="Attendance, by session"
            series={[{ name: "Attendance", color: seriesColor(0) }]}
            categories={attendanceData.map(({ name, value }) => ({
              name: sessionLabel(name),
              values: [value],
            }))}
          />
        ) : null}
      </ChartCard>

      <ChartCard title="Drop-out reasons">
        {dropoutData.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Students dropped out"
            slices={dropoutData.map(({ name, value }, index) => ({
              name,
              value,
              color: seriesColor(index),
            }))}
          />
        ) : null}
      </ChartCard>

      <ChartCard title="Student information completion">
        {completionData.length ? (
          <CompletionRing
            label="Student information complete"
            percentage={completionData.find(({ name }) => name === "actual")?.value ?? 0}
          />
        ) : null}
      </ChartCard>

      <ChartCard title="Student group ratings">
        {ratingsData.length ? (
          <LineChart
            label="Average student group rating, by session"
            series={[{ name: "Average rating", color: seriesColor(0) }]}
            minimumTop={5}
            categories={ratingsData.map(({ session, value }) => ({
              name: sessionLabel(session),
              values: [value],
            }))}
          />
        ) : null}
      </ChartCard>
    </div>
  );
}
