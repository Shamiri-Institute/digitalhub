import { orderedSeriesColor, seriesColor } from "#/components/charts/constants";
import { RingBreakdown } from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";

export default function StudentsStatsBreakdown({
  studentsStats,
}: {
  studentsStats: {
    formStats: { form: string | null; value: number }[];
    ageStats: { age: string | null; value: number }[];
    genderStats: { gender: string | null; value: number }[];
  };
}) {
  const { formStats, ageStats, genderStats } = studentsStats;
  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-3">
      <ChartCard title="Students grouped by form">
        {formStats.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Students"
            slices={formStats.map(({ form, value }, index) => ({
              name: form ?? "Not recorded",
              value,
              color: orderedSeriesColor(index, formStats.length),
            }))}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="Students grouped by age">
        {ageStats.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Students"
            slices={ageStats.map(({ age, value }, index) => ({
              name: age ?? "Not recorded",
              value,
              color: orderedSeriesColor(index, ageStats.length),
            }))}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="Students grouped by gender">
        {genderStats.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Students"
            slices={genderStats.map(({ gender, value }, index) => ({
              name: gender ?? "Not recorded",
              value,
              color: seriesColor(index),
            }))}
          />
        ) : null}
      </ChartCard>
    </div>
  );
}
