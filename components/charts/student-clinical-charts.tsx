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
import { clinicalCasesColors, possibleSessions } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import type { StudentClinicalStats } from "#/lib/actions/clinical/students";

export default function HubStudentClinicalDataCharts({
  clinicalStats,
}: {
  clinicalStats: StudentClinicalStats;
}) {
  const caseStatusCounts = (["Active", "FollowUp", "Terminated"] as const).map((name) => ({
    name,
    value: clinicalStats.casesByStatus[name] ?? 0,
  }));

  const emptyDataObject = [
    {
      name: "",
      value: 100,
    },
  ];

  const sumOfCases = caseStatusCounts.reduce((a, b) => {
    return a + b.value;
  }, 0);

  const filteredFormatedSessions = possibleSessions.map((session) => {
    const found = clinicalStats.sessionsBySession.find((item) => item.session === session);
    return {
      session,
      count: found ? found.count : 0,
    };
  });

  const filteredByInitialReferredFrom = clinicalStats.casesByReferredFrom.map((item) => {
    return {
      initialReferredFrom: item.initialReferredFromSpecified,
      count: item.count,
    };
  });

  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <ChartCard title="Clinical cases by case status" showCardFooter={false}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart width={250} height={250}>
            <Pie
              data={(sumOfCases === 0 ? emptyDataObject : caseStatusCounts).map((entry, index) => ({
                ...entry,
                fill:
                  sumOfCases === 0
                    ? "#e5e7eb"
                    : clinicalCasesColors[index % clinicalCasesColors.length],
              }))}
              dataKey="value"
              nameKey="name"
              startAngle={90}
              endAngle={450}
              outerRadius={80}
              innerRadius={55}
            >
              <Label position="center" className="text-xl font-semibold leading-8" fill="#000">
                {caseStatusCounts.reduce((acc, d) => acc + d.value, 0)}
              </Label>
            </Pie>
            <Tooltip />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={`Clinical sessions  (${clinicalStats.sessionCount})`}
        showCardFooter={false}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredFormatedSessions}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="session" tick={{ fontSize: 12 }} />
            <YAxis dataKey="count" tick={{ fontSize: 12 }} width={35} />
            <Tooltip />
            <Bar dataKey="count" fill="#0085FF" name="Sessions" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Clinical cases by supervisor" showCardFooter={false}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={clinicalStats.casesBySupervisor}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="supervisorName" tick={false} axisLine={false} />
            <YAxis dataKey="count" tick={{ fontSize: 12 }} width={35} />
            <Tooltip formatter={(value) => [`${value} cases`, "Cases"]} />
            <Bar dataKey="count" fill="#E92C9D" name="Cases" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Clinical cases by initial contact" showCardFooter={false}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart width={250} height={250}>
            <Pie
              data={filteredByInitialReferredFrom.map((entry, index) => ({
                ...entry,
                fill: clinicalCasesColors[index % clinicalCasesColors.length],
              }))}
              dataKey="count"
              nameKey="initialReferredFrom"
              startAngle={90}
              endAngle={450}
              outerRadius={100}
              innerRadius={70}
            >
              <Label position="center" className="text-2xl font-semibold leading-8" fill="#000">
                {filteredByInitialReferredFrom.reduce((acc, d) => acc + d.count, 0)}
              </Label>
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
