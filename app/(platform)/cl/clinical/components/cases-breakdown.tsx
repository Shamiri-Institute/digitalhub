"use client";

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

const CASE_STATUS_COLORS = {
  OPEN: "#0085FF",
  CLOSED: "#00BA34",
  REFERRED: "#F98600",
};

const RISK_STATUS_COLORS = {
  HIGH: "#FF4D4F",
  MEDIUM: "#F98600",
  LOW: "#00BA34",
};

export default function CasesBreakdown() {
  const data = {
    casesByStatus: [],
    casesByRiskStatus: [],
    casesBySession: [],
    casesBySupervisor: [],
  };

  return (
    <div className="grid grid-cols-1 gap-5 py-2 sm:grid-cols-2 xl:grid-cols-4">
      <ChartCard title="Clinical Cases by Case Status">
        {data.casesByStatus.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={data.casesByStatus}
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
                  {data.casesByStatus.reduce((acc, curr) => acc + curr.value, 0)}
                </Label>
                {data.casesByStatus.map((entry) => (
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
        {data.casesByRiskStatus.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={data.casesByRiskStatus}
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
                  {data.casesByRiskStatus.reduce((acc, curr) => acc + curr.value, 0)}
                </Label>
                {data.casesByRiskStatus.map((entry) => (
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
        {data.casesBySession.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart width={307} height={307} data={data.casesBySession}>
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
        {data.casesBySupervisor.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart width={307} height={307} data={data.casesBySupervisor}>
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
