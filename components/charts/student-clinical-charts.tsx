"use client";

import type { Prisma } from "@prisma/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  clinicalCasesColors,
  clinicaldataValue,
  possibleSessions,
} from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";

type CaseData = { name: "Active" | "FollowUp" | "Terminated"; value: number };

export default function HubStudentClinicalDataCharts({
  hubClinicalCases,
  hubClinicalSessions,
  hubClinicalSessionsBySession,
  clinicalCasesBySupervisors,
  hubClinicalSessionsByInitialReferredFrom,
}: {
  hubClinicalCases: Prisma.ClinicalScreeningInfoGetPayload<{}>[];
  hubClinicalSessions: Prisma.ClinicalSessionAttendanceGetPayload<{}>[];
  hubClinicalSessionsBySession: (Prisma.PickEnumerable<
    Prisma.ClinicalSessionAttendanceGroupByOutputType,
    "session"[]
  > & {
    _count: {
      session: number;
    };
  })[];
  clinicalCasesBySupervisors: {
    supervisorName: string;
    count: number;
  }[];
  hubClinicalSessionsByInitialReferredFrom: (Prisma.PickEnumerable<
    Prisma.ClinicalScreeningInfoGroupByOutputType,
    "initialReferredFromSpecified"[]
  > & {
    _count: {
      initialReferredFrom: number;
    };
  })[];
}) {
  const caseStatusCounts: CaseData[] = [
    { name: "Active", value: 0 },
    { name: "FollowUp", value: 0 },
    { name: "Terminated", value: 0 },
  ];

  hubClinicalCases.forEach((case_) => {
    if (case_.caseStatus === "Active" && caseStatusCounts[0]) {
      caseStatusCounts[0].value += 1;
    } else if (case_.caseStatus === "FollowUp" && caseStatusCounts[1]) {
      caseStatusCounts[1].value += 1;
    } else if (case_.caseStatus === "Terminated" && caseStatusCounts[2]) {
      caseStatusCounts[2].value += 1;
    }
  });

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
    const found = hubClinicalSessionsBySession.find((item) => item.session === session);
    return {
      session,
      count: found ? found._count.session : 0,
    };
  });

  const filteredByInitialReferredFrom = hubClinicalSessionsByInitialReferredFrom.map((item) => {
    return {
      initialReferredFrom: item.initialReferredFromSpecified,
      count: item._count.initialReferredFrom,
    };
  });

  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <ChartCard title="Clinical cases by case status" showCardFooter={false}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart width={250} height={250}>
            <Pie
              data={sumOfCases === 0 ? emptyDataObject : caseStatusCounts}
              dataKey="value"
              nameKey="name"
              startAngle={90}
              endAngle={450}
              outerRadius={100}
              innerRadius={70}
            >
              <Label position="center" className="text-2xl font-semibold leading-8" fill="#000">
                {caseStatusCounts.reduce((acc, d) => acc + d.value, 0)}
              </Label>
              {caseStatusCounts.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={
                    sumOfCases === 0
                      ? "#e5e7eb"
                      : clinicalCasesColors[index % clinicalCasesColors.length]
                  }
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={`Clinical sessions  (${hubClinicalSessions?.length})`}
        showCardFooter={false}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart width={307} height={307} data={filteredFormatedSessions}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="session" />
            <YAxis dataKey="count" />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" stackId="a" fill="#0085FF" />
            <Bar dataKey="session" stackId="a" fill="#CCE7FF" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Clinical cases by supervisor" showCardFooter={false}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart width={307} height={307} data={clinicalCasesBySupervisors}>
            <CartesianGrid strokeDasharray="3 3" />
            {/* <XAxis dataKey="supervisorName" /> */}
            <YAxis dataKey="count" />
            <Tooltip />
            <Bar dataKey="count" stackId="a" fill="#E92C9D" label="Count" />
            <Bar dataKey="supervisorName" stackId="a" fill="#ffdfea" label="Supervisor" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Clinical cases by initial contact" showCardFooter={false}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart width={250} height={250}>
            <Pie
              data={filteredByInitialReferredFrom}
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
              {filteredByInitialReferredFrom.map((entry, index) => (
                <Cell
                  key={entry.initialReferredFrom}
                  fill={clinicalCasesColors[index % clinicalCasesColors.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
