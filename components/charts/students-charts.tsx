"use client";

import type { Prisma } from "@prisma/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { generateRandomColor, possibleInterventionSessions } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";

export default function HubStudentsDetailsCharts({
  studentsAttendanceGroupedBySession,
  studentsDropOutReasonsGroupedByReason,
}: {
  studentsAttendanceGroupedBySession: (Prisma.PickEnumerable<
    Prisma.InterventionSessionGroupByOutputType,
    "sessionType"[]
  > & {
    _count: {
      sessionType: number;
    };
  })[];
  studentsDropOutReasonsGroupedByReason: (Prisma.PickEnumerable<
    Prisma.StudentGroupByOutputType,
    "dropOutReason"[]
  > & {
    _count: {
      dropOutReason: number;
    };
  })[];
}) {
  const filteredFormatedSessions = possibleInterventionSessions.map((session) => {
    const found = studentsAttendanceGroupedBySession.find((item) => item.sessionType === session);
    return {
      sessionType: session,
      attendance: found ? found._count.sessionType : 0,
    };
  });

  const filteredFormatedDropOutReasons = studentsDropOutReasonsGroupedByReason.map((reason) => ({
    name: reason?.dropOutReason ?? "",
    value: reason._count.dropOutReason,
  }));

  const formatedStudentsDropOutReasons = filteredFormatedDropOutReasons.reduce(
    (acc, val) => {
      const existing = acc.find(
        (item) => item.name.trim().toLowerCase() === val.name.trim().toLowerCase(),
      );
      if (existing) {
        existing.value += val.value;
      } else {
        acc.push({ ...val });
      }
      return acc;
    },
    [] as { name: string; value: number }[],
  );

  const randomColors = formatedStudentsDropOutReasons.map(() => generateRandomColor());

  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <ChartCard title="Attendance" showCardFooter={false}>
        {filteredFormatedSessions?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart width={307} height={307} data={filteredFormatedSessions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sessionType" />
              <YAxis dataKey="attendance" />
              <Tooltip labelFormatter={(value) => `Session: ${value}`} />
              <Bar dataKey="attendance" stackId="a" fill="#0085FF" label="Attendance count" />
              <Bar dataKey="sessionType" stackId="a" fill="#CCE7FF" label="Session type" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Drop-out reasons" showCardFooter={false}>
        {formatedStudentsDropOutReasons.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={formatedStudentsDropOutReasons}
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
                  {formatedStudentsDropOutReasons.reduce((acc, val) => acc + val.value, 0)}
                </Label>
                {formatedStudentsDropOutReasons.map((reason, index) => (
                  <Cell key={index} fill={randomColors[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Student information completion" showCardFooter={false}>
        {[].length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={250} height={250}>
              <Pie
                data={[]}
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
                  {0}
                </Label>
                {[].map(({ name }) => (
                  <Cell key={name} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Student group ratings" showCardFooter={false}>
        {[]?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={307} height={307} data={[]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="" />
              <YAxis />
              <Tooltip />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
