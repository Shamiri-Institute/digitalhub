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
import type {
  fetchSupervisorDataCompletenessData,
  SessionRatingAverages,
  SupervisorAttendanceData,
  SupervisorDropoutReasonsGraphData,
} from "#/app/(platform)/hc/supervisors/actions";
import { categoryColor, sessionLabel } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import { SUPERVISOR_DROP_OUT_REASONS } from "#/lib/app-constants/constants";

export default function SupervisorCharts({
  attendanceData,
  dropoutData,
  supervisorDataCompletenessPercentage,
  supervisorsSessionRatings,
}: {
  attendanceData: SupervisorAttendanceData[];
  dropoutData: SupervisorDropoutReasonsGraphData[];
  supervisorDataCompletenessPercentage: Awaited<
    ReturnType<typeof fetchSupervisorDataCompletenessData>
  >;
  supervisorsSessionRatings: SessionRatingAverages[];
}) {
  const formattedAttendanceData = attendanceData.map((session) => ({
    supervisor_name: session.supervisor_name,
    attended: session.attended,
  }));

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Attendances">
        {formattedAttendanceData?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              width={307}
              height={307}
              data={formattedAttendanceData}
              aria-label="Attendances"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="supervisor_name" />
              <YAxis dataKey="attended" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="attended" fill="var(--color-primary)" name="Attended" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Drop out reasons">
        {dropoutData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Drop out reasons">
              <Pie
                data={dropoutData.map((reason) => ({
                  ...reason,
                  fill: categoryColor(reason.name, SUPERVISOR_DROP_OUT_REASONS),
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
                  className="fill-foreground text-2xl font-semibold leading-8"
                >
                  {dropoutData.reduce((acc, val) => acc + val.value, 0)}
                </Label>
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Supervisor information completion">
        {supervisorDataCompletenessPercentage.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={250} height={250} aria-label="Supervisor information completion">
              <Pie
                data={supervisorDataCompletenessPercentage.map((entry) => ({
                  ...entry,
                  fill: entry.name === "actual" ? "var(--color-primary)" : "var(--color-info-bg)",
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
                  className="fill-foreground text-2xl font-semibold leading-8"
                >
                  {`${supervisorDataCompletenessPercentage.find((d) => d.name === "actual")?.value}%`}
                </Label>
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Ratings">
        {supervisorsSessionRatings?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              width={307}
              height={307}
              data={supervisorsSessionRatings}
              aria-label="Ratings"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session_type" tickFormatter={sessionLabel} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(value) => sessionLabel(String(value))} />
              <Legend />
              <Line
                dataKey="student_behaviour"
                stroke="var(--color-chart-1)"
                name="Student behaviour"
              />
              <Line dataKey="admin_support" stroke="var(--color-chart-2)" name="Admin support" />
              <Line dataKey="workload" stroke="var(--color-chart-3)" name="Workload" />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
