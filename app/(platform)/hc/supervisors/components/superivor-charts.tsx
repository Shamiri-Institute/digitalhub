"use client";

import {
  fetchSupervisorDataCompletenessData,
  SessionRatingAverages,
  SupervisorAttendanceData,
  SupervisorDropoutReasonsGraphData,
} from "#/app/(platform)/hc/supervisors/actions";
import { generateRandomColor } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import {
  SCHOOL_DATA_COMPLETENESS_COLOR_MAPPING,
  SCHOOL_DROPOUT_REASONS_MAPPING,
} from "#/lib/app-constants/constants";
import { Prisma } from "@prisma/client";
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

  const randomColors = dropoutData.map(() => generateRandomColor());
  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <ChartCard title="Attendances" showCardFooter={false}>
        {formattedAttendanceData?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart width={307} height={307} data={formattedAttendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="supervisor_name" />
              <YAxis dataKey="attended" />
              <Tooltip />
              <Bar dataKey="attended" stackId="a" fill="#0085FF" />
              <Bar dataKey="supervisor_name" stackId="a" fill="#CCE7FF" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Drop out reasons" showCardFooter={false}>
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
                fill="#8884d8"
              >
                <Label
                  position="center"
                  className="text-2xl font-semibold leading-8 text-shamiri-black"
                >
                  {dropoutData.reduce((acc, val) => acc + val.value, 0)}
                </Label>
                {dropoutData.map((reason, index) => (
                  <Cell
                    key={index}
                    // @ts-ignore
                    fill={SCHOOL_DROPOUT_REASONS_MAPPING[reason.name]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard
        title="Supervisor information completion"
        showCardFooter={false}
      >
        {supervisorDataCompletenessPercentage.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={250} height={250}>
              <Pie
                data={supervisorDataCompletenessPercentage}
                dataKey="value"
                nameKey="name"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
              >
                <Label
                  position="center"
                  className="text text-2xl font-semibold leading-8"
                  fill="#fffff"
                >
                  {supervisorDataCompletenessPercentage.find(
                    (d) => (d.name = "actual"),
                  )?.value + "%"}
                </Label>
                {supervisorDataCompletenessPercentage.map(({ name }) => (
                  <Cell
                    key={name}
                    // @ts-ignore
                    fill={SCHOOL_DATA_COMPLETENESS_COLOR_MAPPING[name]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Ratings" showCardFooter={false}>
        {supervisorsSessionRatings?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              width={307}
              height={307}
              data={supervisorsSessionRatings}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session_type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="student_behaviour" stroke="#0085FF" />
              <Line dataKey="admin_support" stroke="#00BA34" />
              <Line dataKey="workload" stroke="#F98600" />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
