"use client";

import { Label, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { generateRandomColor, studentsGroupByColors } from "#/components/charts/constants";
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
  const randomColors = studentsStats.ageStats.map(() => generateRandomColor());

  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-3">
      <ChartCard title="Students grouped by form" showCardFooter={false}>
        {studentsStats.formStats.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={studentsStats.formStats.map((val, index) => ({
                  ...val,
                  fill: studentsGroupByColors[index % studentsGroupByColors.length],
                }))}
                dataKey="value"
                nameKey="form"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
                fill="#8884d8"
              >
                <Label
                  position="center"
                  className="text-2xl font-semibold leading-8 text-shamiri-black"
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
            <PieChart width={307} height={307}>
              <Pie
                data={studentsStats.ageStats.map((val, index) => ({
                  ...val,
                  fill: randomColors[index],
                }))}
                dataKey="value"
                nameKey="age"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
                fill="#8884d8"
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
            <PieChart width={307} height={307}>
              <Pie
                data={studentsStats.genderStats.map((val, index) => ({
                  ...val,
                  fill: studentsGroupByColors[index % studentsGroupByColors.length],
                }))}
                dataKey="value"
                nameKey="gender"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
                fill="#8884d8"
              >
                <Label
                  position="center"
                  className="text-2xl font-semibold leading-8 text-shamiri-black"
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
