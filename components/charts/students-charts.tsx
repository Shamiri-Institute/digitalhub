"use client";

import type { Prisma } from "@prisma/client";
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
import { generateRandomColor, possibleInterventionSessions } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";

export default function HubStudentsDetailsCharts({
  studentsAttendanceGroupedBySession,
  studentsDropOutReasonsGroupedByReason,
  studentInfoCompletion = [],
  studentGroupRatings = [],
}: {
  studentsAttendanceGroupedBySession: {
    sessionType: string | null;
    _count: { sessionType: number };
  }[];
  studentsDropOutReasonsGroupedByReason: (Prisma.PickEnumerable<
    Prisma.StudentGroupByOutputType,
    "dropOutReason"[]
  > & {
    _count: {
      dropOutReason: number;
    };
  })[];
  studentInfoCompletion?: { name: string; value: number }[];
  studentGroupRatings?: { session: string; value: number }[];
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
              <Bar dataKey="attendance" stackId="a" fill="#0085FF" />
              <Bar dataKey="sessionType" stackId="a" fill="#CCE7FF" />
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
                  <Cell key={reason.name} fill={randomColors[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Student information completion" showCardFooter={false}>
        {studentInfoCompletion.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={250} height={250}>
              <Pie
                data={studentInfoCompletion}
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
                  {`${studentInfoCompletion.find((d) => d.name === "actual")?.value ?? 0}%`}
                </Label>
                {studentInfoCompletion.map((entry) => (
                  <Cell key={entry.name} fill={entry.name === "actual" ? "#0085FF" : "#EFF6FF"} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Student group ratings" showCardFooter={false}>
        {studentGroupRatings.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={307} height={307} data={studentGroupRatings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session" />
              <YAxis domain={[0, 5]} />
              <Tooltip
                formatter={(value) => (typeof value === "number" ? value.toFixed(2) : value)}
              />
              <Legend />
              <Line type="monotone" dataKey="value" name="Avg rating" stroke="#0085FF" />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
