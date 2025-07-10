"use client";

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
import ChartCard from "#/components/ui/chart-card";

const CASE_STATUS_COLORS = {
  Active: "#0085FF",
  Terminated: "#00BA34",
  FollowUp: "#F98600",
  Referred: "#FF4D4F",
};

const RISK_STATUS_COLORS = {
  No: "#FF4D4F",
  Low: "#F98600",
  Medium: "#00BA34",
  High: "#0085FF",
};

export default function CasesBreakdown({
  casesByStatus = [],
  casesByRiskStatus = [],
  casesBySession = [],
  casesBySupervisor = [],
}: {
  casesByStatus: {
    name: string;
    value: number;
  }[];
  casesByRiskStatus: {
    name: string;
    value: number;
  }[];
  casesBySession: {
    name: string;
    total: number;
  }[];
  casesBySupervisor: {
    name: string;
    total: number;
  }[];
}) {
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
                {casesByStatus.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={CASE_STATUS_COLORS[entry.name as keyof typeof CASE_STATUS_COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Cases by Risk Status">
        {casesByRiskStatus.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={casesByRiskStatus}
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
                  {casesByRiskStatus.reduce((acc, curr) => acc + curr.value, 0)}
                </Label>
                {casesByRiskStatus.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={RISK_STATUS_COLORS[entry.name as keyof typeof RISK_STATUS_COLORS]}
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
              <Bar dataKey="total" fill="#0085FF" />
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
              <Bar dataKey="total" fill="#0085FF" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
