"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CASE_STATUS_COLORS, categoryColor, possibleSessions } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import { caseStatusOptions } from "#/db/enums";
import type { StudentClinicalStats } from "#/lib/actions/clinical/students";

const INITIAL_CONTACTS = ["student", "fellow", "supervisor", "teacher"];

const pieLegend = (
  <Legend
    layout="horizontal"
    verticalAlign="bottom"
    align="center"
    iconType="circle"
    iconSize={8}
  />
);

export default function HubStudentClinicalDataCharts({
  clinicalStats,
}: {
  clinicalStats: StudentClinicalStats;
}) {
  const caseStatusCounts = Object.values(caseStatusOptions)
    .map((status) => ({
      name: status === "FollowUp" ? "Follow-up" : status,
      value: clinicalStats.casesByStatus[status] ?? 0,
      fill: CASE_STATUS_COLORS[status],
    }))
    .filter(({ value }) => value > 0);

  const filteredFormatedSessions = possibleSessions.map((session) => {
    const found = clinicalStats.sessionsBySession.find((item) => item.session === session);
    return {
      session,
      count: found ? found.count : 0,
    };
  });

  const casesByInitialContact = clinicalStats.casesByReferredFrom
    .filter(({ count }) => count > 0)
    .map(({ initialReferredFromSpecified, count }) => ({
      name: initialReferredFromSpecified
        ? initialReferredFromSpecified.charAt(0).toUpperCase() +
          initialReferredFromSpecified.slice(1)
        : "Not recorded",
      count,
      fill: categoryColor(initialReferredFromSpecified ?? "", INITIAL_CONTACTS),
    }));

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Clinical cases by case status">
        {caseStatusCounts.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={250} height={250} aria-label="Clinical cases by case status">
              <Pie
                data={caseStatusCounts}
                dataKey="value"
                nameKey="name"
                startAngle={90}
                endAngle={450}
                outerRadius={80}
                innerRadius={55}
              >
                <Label
                  position="center"
                  className="fill-foreground text-xl font-semibold leading-8"
                >
                  {caseStatusCounts.reduce((acc, d) => acc + d.value, 0)}
                </Label>
              </Pie>
              <Tooltip />
              {pieLegend}
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title={`Clinical sessions (${clinicalStats.sessionCount})`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredFormatedSessions}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            aria-label="Clinical sessions"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="session" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis dataKey="count" tick={{ fontSize: 12 }} width={35} allowDecimals={false} />
            <Tooltip />
            <Bar
              dataKey="count"
              fill="var(--color-primary)"
              name="Sessions"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Clinical cases by supervisor">
        {clinicalStats.casesBySupervisor.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={clinicalStats.casesBySupervisor}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              aria-label="Clinical cases by supervisor"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="supervisorName"
                tick={{ fontSize: 12 }}
                width={80}
                interval={0}
              />
              <Tooltip formatter={(value) => [`${value} cases`, "Cases"]} />
              <Bar dataKey="count" fill="var(--color-primary)" name="Cases" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Clinical cases by initial contact">
        {casesByInitialContact.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={250} height={250} aria-label="Clinical cases by initial contact">
              <Pie
                data={casesByInitialContact}
                dataKey="count"
                nameKey="name"
                startAngle={90}
                endAngle={450}
                outerRadius={80}
                innerRadius={55}
              >
                <Label
                  position="center"
                  className="fill-foreground text-xl font-semibold leading-8"
                >
                  {casesByInitialContact.reduce((acc, d) => acc + d.count, 0)}
                </Label>
              </Pie>
              <Tooltip />
              {pieLegend}
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
