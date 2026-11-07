"use client";

import type { student } from "#/db/schema";
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
import {
  categoryColor,
  possibleInterventionSessions,
  sessionLabel,
} from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import { STUDENT_DROPOUT_REASONS } from "#/lib/app-constants/constants";

export default function HubStudentsDetailsCharts({
  studentsAttendanceGroupedBySession,
  studentsDropOutReasonsGroupedByReason,
  studentInfoCompletion = [],
  studentGroupRatings = [],
}: {
  studentsAttendanceGroupedBySession: {
    sessionType: string | null;
    count: number;
  }[];
  studentsDropOutReasonsGroupedByReason: {
    dropOutReason: (typeof student.$inferSelect)["dropOutReason"];
    count: number;
  }[];
  studentInfoCompletion?: { name: string; value: number }[];
  studentGroupRatings?: { session: string; value: number }[];
}) {
  const filteredFormatedSessions = possibleInterventionSessions.map((session) => {
    const found = studentsAttendanceGroupedBySession.find((item) => item.sessionType === session);
    return {
      sessionType: session,
      attendance: found ? found.count : 0,
    };
  });

  const filteredFormatedDropOutReasons = studentsDropOutReasonsGroupedByReason.map((reason) => ({
    name: reason?.dropOutReason ?? "",
    value: reason.count,
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

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Attendance" showCardFooter={false}>
        {filteredFormatedSessions?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              width={307}
              height={307}
              data={filteredFormatedSessions}
              aria-label="Attendance"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sessionType" tickFormatter={sessionLabel} />
              <YAxis dataKey="attendance" allowDecimals={false} />
              <Tooltip labelFormatter={(value) => `Session: ${sessionLabel(String(value))}`} />
              <Bar dataKey="attendance" name="Sessions" fill="var(--color-shamiri-new-blue)" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Drop-out reasons" showCardFooter={false}>
        {formatedStudentsDropOutReasons.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Drop-out reasons">
              <Pie
                data={formatedStudentsDropOutReasons.map((reason) => ({
                  ...reason,
                  fill: categoryColor(reason.name, STUDENT_DROPOUT_REASONS),
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
                  {formatedStudentsDropOutReasons.reduce((acc, val) => acc + val.value, 0)}
                </Label>
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Student information completion" showCardFooter={false}>
        {studentInfoCompletion.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={250} height={250} aria-label="Student information completion">
              <Pie
                data={studentInfoCompletion.map((entry) => ({
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
                  {`${studentInfoCompletion.find((d) => d.name === "actual")?.value ?? 0}%`}
                </Label>
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Student group ratings" showCardFooter={false}>
        {studentGroupRatings.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              width={307}
              height={307}
              data={studentGroupRatings}
              aria-label="Student group ratings"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session" tickFormatter={sessionLabel} />
              <YAxis domain={[0, 5]} allowDecimals={false} />
              <Tooltip
                labelFormatter={(value) => sessionLabel(String(value))}
                formatter={(value) => (typeof value === "number" ? value.toFixed(2) : value)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name="Avg rating"
                stroke="var(--color-shamiri-new-blue)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
