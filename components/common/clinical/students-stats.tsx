"use client";

import { Label, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SERIES_COLORS, orderedSeriesColor } from "#/components/charts/constants";
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
  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-3">
      <ChartCard title="Students grouped by form" showCardFooter={false}>
        {studentsStats.formStats.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Students grouped by form">
              <Pie
                data={studentsStats.formStats.map((val, index, forms) => ({
                  ...val,
                  fill: orderedSeriesColor(index, forms.length),
                }))}
                dataKey="value"
                nameKey="form"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
              >
                <Label
                  position="center"
                  className="fill-shamiri-black text-2xl font-semibold leading-8"
                >
                  {studentsStats.formStats.reduce(
                    (acc: number, val: { value: number }) => acc + val.value,
                    0,
                  )}
                </Label>
              </Pie>
              <Tooltip formatter={(value) => `${value} students`} />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Students grouped by age" showCardFooter={false}>
        {studentsStats.ageStats.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Students grouped by age">
              <Pie
                data={studentsStats.ageStats.map((val, index, ages) => ({
                  ...val,
                  fill: orderedSeriesColor(index, ages.length),
                }))}
                dataKey="value"
                nameKey="age"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
              />
              <Tooltip
                formatter={(value) => `${value} students`}
                labelFormatter={(label) => `${label} years`}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Students grouped by gender" showCardFooter={false}>
        {studentsStats.genderStats.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Students grouped by gender">
              <Pie
                data={studentsStats.genderStats.map((val, index) => ({
                  ...val,
                  fill: SERIES_COLORS[index],
                }))}
                dataKey="value"
                nameKey="gender"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
              >
                <Label
                  position="center"
                  className="fill-shamiri-black text-2xl font-semibold leading-8"
                >
                  {studentsStats.genderStats.reduce(
                    (acc: number, val: { value: number }) => acc + val.value,
                    0,
                  )}
                </Label>
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
