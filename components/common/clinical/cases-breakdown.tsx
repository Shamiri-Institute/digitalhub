"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CASE_STATUS_COLORS } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";

const RISK_STATUS_COLORS = {
  No: "var(--color-shamiri-graph-green)",
  Low: "var(--color-shamiri-graph-yellow)",
  Medium: "var(--color-shamiri-light-orange)",
  High: "var(--color-shamiri-light-red)",
};

export default function CasesBreakdown({
  casesByStatus,
  casesByRiskStatus,
  casesBySession,
  casesBySupervisor,
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
            <PieChart width={307} height={307} aria-label="Clinical cases by case status">
              <Pie
                data={casesByStatus.map((entry) => ({
                  ...entry,
                  name: entry.name === "FollowUp" ? "Follow-up" : entry.name,
                  fill: CASE_STATUS_COLORS[entry.name as keyof typeof CASE_STATUS_COLORS],
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
                  {casesByStatus.reduce((acc, curr) => acc + curr.value, 0)}
                </Label>
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Cases by Risk Status">
        {casesByRiskStatus.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Clinical cases by risk status">
              <Pie
                data={casesByRiskStatus.map((entry) => ({
                  ...entry,
                  fill: RISK_STATUS_COLORS[entry.name as keyof typeof RISK_STATUS_COLORS],
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
                  {casesByRiskStatus.reduce((acc, curr) => acc + curr.value, 0)}
                </Label>
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Sessions">
        {casesBySession.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart width={307} height={307} data={casesBySession} aria-label="Clinical sessions">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" name="Sessions" fill="var(--color-shamiri-new-blue)" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Cases by Supervisor">
        {casesBySupervisor.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              width={307}
              height={307}
              data={casesBySupervisor}
              aria-label="Clinical cases by supervisor"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" name="Cases" fill="var(--color-shamiri-new-blue)" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
