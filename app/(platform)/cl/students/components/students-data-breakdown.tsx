"use client";

import { generateRandomColor } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  const randomColors = dropoutData.map(() => generateRandomColor());

  return (
    <div className="grid grid-cols-1 gap-5 py-2 sm:grid-cols-2 xl:grid-cols-4">
      <ChartCard title="Attendance" showCardFooter={false}>
        {attendanceData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart width={307} height={307} data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0085FF" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Drop-out reasons" showCardFooter={false}>
        {dropoutData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={dropoutData}
                dataKey="value"
                nameKey="name"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
              >
                <Label
                  position="center"
                  className="text-2xl font-semibold leading-8 text-shamiri-black"
                >
                  {dropoutData.reduce((acc, curr) => acc + curr.value, 0)}
                </Label>
                {dropoutData.map((entry, index) => (
                  <Cell key={entry.name} fill={randomColors[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Student information completion" showCardFooter={false}>
        {completionData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={completionData}
                dataKey="value"
                nameKey="name"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
              >
                <Label
                  position="center"
                  className="text-2xl font-semibold leading-8 text-shamiri-black"
                >
                  {completionData.find((d) => d.name === "actual")?.value}%
                </Label>
                {completionData.map((entry) => (
                  <Cell key={entry.name} fill={entry.name === "actual" ? "#0085FF" : "#EFF6FF"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Student group ratings" showCardFooter={false}>
        {ratingsData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={307} height={307} data={ratingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#0085FF" />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
