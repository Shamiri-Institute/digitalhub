import { CASE_STATUS_COLORS, seriesColor } from "#/components/charts/constants";
import { BarList, ColumnChart, RingBreakdown } from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";

const RISK_STATUS_COLORS = {
  No: "var(--color-success)",
  Low: "var(--color-chart-5)",
  Medium: "var(--color-chart-3)",
  High: "var(--color-destructive)",
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
        {casesByStatus.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Clinical cases"
            slices={casesByStatus.map(({ name, value }, index) => ({
              name: name === "FollowUp" ? "Follow-up" : name,
              value,
              color:
                CASE_STATUS_COLORS[name as keyof typeof CASE_STATUS_COLORS] ?? seriesColor(index),
            }))}
          />
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Cases by Risk Status">
        {casesByRiskStatus.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Clinical cases"
            slices={casesByRiskStatus.map(({ name, value }, index) => ({
              name,
              value,
              color:
                RISK_STATUS_COLORS[name as keyof typeof RISK_STATUS_COLORS] ?? seriesColor(index),
            }))}
          />
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Sessions">
        {casesBySession.length ? (
          <ColumnChart
            label="Clinical sessions, by session"
            series={[{ name: "Sessions", color: "var(--color-primary)" }]}
            categories={casesBySession.map(({ name, total }) => ({ name, values: [total] }))}
          />
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Cases by Supervisor">
        {casesBySupervisor.length ? (
          <BarList
            label="Clinical cases, by supervisor"
            rows={casesBySupervisor
              .map(({ name, total }) => ({ name, value: total }))
              .toSorted((first, second) => second.value - first.value)}
          />
        ) : null}
      </ChartCard>
    </div>
  );
}
