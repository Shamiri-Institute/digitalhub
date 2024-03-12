"use client";

import ChartCard from "#/components/ui/chart-card";
import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function ChartArea({
  dropoutData,
  sessionAttendanceData,
}: {
  dropoutData: any;
  sessionAttendanceData: any;
}) {
  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <ChartCard title="Attendance" />
      <ChartCard title="Drop out reasons">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart width={307} height={307}>
            <Pie
              data={dropoutData}
              dataKey="value"
              nameKey="name"
              outerRadius={80}
              fill="#8884d8"
            />
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="School information completion" />
      <ChartCard title="Ratings" />
    </div>
  );
}
