"use client";

import { memo } from "react";
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
import { categoryColor, sessionLabel } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import { SCHOOL_DROPOUT_REASONS } from "#/lib/app-constants/constants";
import type {
  DropoutReasonsGraphData,
  fetchSchoolDataCompletenessData,
  SchoolAttendances,
  SessionRatingAverages,
} from "../actions";

const ChartArea = memo(function ChartArea({
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
  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Session progress" showCardFooter={false}>
        {schoolAttendances?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              width={307}
              height={307}
              data={schoolAttendances}
              aria-label="Session progress"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session_type" tickFormatter={sessionLabel} />
              <Tooltip labelFormatter={(value) => sessionLabel(String(value))} />
              <Legend iconType="square" iconSize={8} />
              <Bar
                dataKey="count_attendance_marked"
                stackId="a"
                fill="var(--color-shamiri-new-blue)"
                name="Attendance marked"
              />
              <Bar
                dataKey="count_attendance_unmarked"
                stackId="a"
                fill="var(--color-shamiri-new-lighter-blue)"
                name="Attendance unmarked"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Drop out reasons" showCardFooter={false}>
        {dropoutData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Drop out reasons">
              <Pie
                data={dropoutData.map((reason) => ({
                  ...reason,
                  fill: categoryColor(reason.name, SCHOOL_DROPOUT_REASONS),
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
                  className="fill-shamiri-black text-2xl font-semibold leading-8"
                >
                  {dropoutData.reduce((acc, val) => acc + val.value, 0)}
                </Label>
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="School information completion" showCardFooter={false}>
        {schoolDataCompletenessData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={250} height={250} aria-label="School information completion">
              <Pie
                data={schoolDataCompletenessData.map((entry) => ({
                  ...entry,
                  fill:
                    entry.name === "actual"
                      ? "var(--color-shamiri-new-blue)"
                      : "var(--color-shamiri-new-light-blue)",
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
                  className="fill-shamiri-black text-2xl font-semibold leading-8"
                >
                  {`${schoolDataCompletenessData.find((d) => d.name === "actual")?.value}%`}
                </Label>
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Ratings" showCardFooter={false}>
        {sessionRatingsData?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={307} height={307} data={sessionRatingsData} aria-label="Ratings">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session_type" tickFormatter={sessionLabel} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(value) => sessionLabel(String(value))} />
              <Legend />
              <Line
                dataKey="student_behavior"
                stroke="var(--color-shamiri-new-blue)"
                name="Student behaviour"
              />
              <Line
                dataKey="admin_support"
                stroke="var(--color-shamiri-graph-green)"
                name="Admin support"
              />
              <Line dataKey="workload" stroke="var(--color-shamiri-light-orange)" name="Workload" />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
});

export default ChartArea;
