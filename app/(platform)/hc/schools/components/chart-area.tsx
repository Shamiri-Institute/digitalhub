"use client";

import ChartCard from "#/components/ui/chart-card";
import { SCHOOL_DROPOUT_REASONS_MAPPING } from "#/lib/app-constants/constants";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { DropoutReasonsGraphData } from "../actions";

export default function ChartArea({
  dropoutData,
}: {
  dropoutData: DropoutReasonsGraphData[];
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
            >
              {dropoutData.map((reason) => (
                <Cell
                  key={reason.name}
                  // FIXME: remove this ts-ignore to be consistent across the app
                  // @ts-ignore
                  fill={SCHOOL_DROPOUT_REASONS_MAPPING[reason.name]}
                />
              ))}
            </Pie>
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
