"use client";

import { clinicalCasesColors } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ClinicalStats({
  clinicalData,
}: {
  clinicalData: {
    casesByStatus: {
      name: string;
      value: number;
    }[];
    casesBySession: {
      name: string;
      value: number;
    }[];
    casesBySupervisor: {
      name: string;
      value: number;
    }[];
    casesByInitialContact: {
      name: string;
      value: number;
    }[];
  };
}) {
  const {
    casesByStatus = [],
    casesBySession = [],
    casesBySupervisor = [],
    casesByInitialContact = [],
  } = clinicalData;

  return (
    <div className="grid grid-cols-1 gap-5 py-2 sm:grid-cols-2 xl:grid-cols-4">
      <ChartCard title="Clinical Cases by Case Status">
        {casesByStatus.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={casesByStatus}
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
                  {casesByStatus.reduce((acc, curr) => acc + curr.value, 0)}
                </Label>
                {casesByStatus.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={
                      clinicalCasesColors[index % clinicalCasesColors.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Sessions">
        {casesBySession.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart width={307} height={307} data={casesBySession}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0085FF" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Cases by Supervisor">
        {casesBySupervisor.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart width={307} height={307} data={casesBySupervisor}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#E92C9D" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Cases by Initial Contact">
        {casesByInitialContact.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={casesByInitialContact}
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
                  {casesByInitialContact.reduce(
                    (acc, curr) => acc + curr.value,
                    0,
                  )}
                </Label>
                {casesByInitialContact.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={
                      clinicalCasesColors[index % clinicalCasesColors.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
