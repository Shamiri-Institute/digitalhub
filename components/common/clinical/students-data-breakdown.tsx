"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { seriesColor } from "#/components/charts/constants";
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
  const dropoutColors = dropoutData.map((_, index) => seriesColor(index));

  return (
    <div className="grid grid-cols-1 gap-5 py-2 sm:grid-cols-2 xl:grid-cols-4">
      <ChartCard title="Attendance">
        {attendanceData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart width={307} height={307} data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={seriesColor(0)} />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Drop-out reasons">
        {dropoutData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={dropoutData.map((entry, index) => ({ ...entry, fill: dropoutColors[index] }))}
                dataKey="value"
                nameKey="name"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
              >
                <Label
                  position="center"
                  className="text-2xl font-semibold leading-8 text-foreground"
                >
                  {dropoutData.reduce((acc, curr) => acc + curr.value, 0)}
                </Label>
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Student information completion">
        {completionData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={completionData.map((entry) => ({
                  ...entry,
                  fill: entry.name === "actual" ? seriesColor(0) : "var(--color-info-bg)",
                }))}
                dataKey="value"
                nameKey="name"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
              >
                <Label
                  position="center"
                  className="text-2xl font-semibold leading-8 text-foreground"
                >
                  {`${completionData.find((d) => d.name === "actual")?.value ?? 0}%`}
                </Label>
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Student group ratings">
        {ratingsData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={307} height={307} data={ratingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={seriesColor(0)} />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
