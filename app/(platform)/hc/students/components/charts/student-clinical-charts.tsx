"use client";

import {
  clinicalCasesColors,
  clinicaldataValue,
  possibleSessions,
} from "#/app/(platform)/hc/students/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import { Prisma } from "@prisma/client";
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
    "initialReferredFrom"[]
  > & {
    _count: {
      initialReferredFrom: number;
    };
  })[];
}) {
  hubClinicalCases.forEach((case_) => {
    if (case_.caseStatus === "Active") {
      (clinicaldataValue[0] as CaseData).value += 1;
    } else if (case_.caseStatus === "FollowUp") {
      (clinicaldataValue[1] as CaseData).value += 1;
    } else if (case_.caseStatus === "Terminated") {
      (clinicaldataValue[2] as CaseData).value += 1;
    }
  });

  const emptyDataObject = [
    {
      name: "",
      value: 100,
    },
  ];

  const sumOfCases = clinicaldataValue.reduce((a, b) => {
    return a + b.value;
  }, 0);

  const filteredFormatedSessions = possibleSessions.map((session) => {
    const found = hubClinicalSessionsBySession.find(
      (item) => item.session === session,
    );
    return {
      session,
      count: found ? found._count.session : 0,
    };
  });

  const filteredByInitialReferredFrom =
    hubClinicalSessionsByInitialReferredFrom.map((item) => {
      return {
        initialReferredFrom: item.initialReferredFrom,
        count: item._count.initialReferredFrom,
      };
    });

  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <ChartCard title="Clinical cases by case status" showCardFooter={false}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart width={250} height={250}>
            <Pie
              data={sumOfCases === 0 ? emptyDataObject : clinicaldataValue}
              dataKey="value"
              nameKey="name"
              startAngle={90}
              endAngle={450}
              outerRadius={100}
              innerRadius={70}
            >
              <Label
                position="center"
                className="text-2xl font-semibold leading-8"
                fill="#000"
              >
                {clinicaldataValue.reduce((acc, d) => acc + d.value, 0)}
              </Label>
              {clinicaldataValue.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
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
            <Legend />
            <Bar dataKey="count" stackId="a" fill="#0085FF" />
            <Bar dataKey="supervisorName" stackId="a" fill="#CCE7FF" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard
        title="Clinical cases by initial contact"
        showCardFooter={false}
      >
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
              <Label
                position="center"
                className="text-2xl font-semibold leading-8"
                fill="#000"
              >
                {filteredByInitialReferredFrom.reduce(
                  (acc, d) => acc + d.count,
                  0,
                )}
              </Label>
              {filteredByInitialReferredFrom.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
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
