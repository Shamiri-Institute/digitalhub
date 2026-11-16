import { CASE_STATUS_COLORS, seriesColor } from "#/components/charts/constants";
import { BarList, ColumnChart, RingBreakdown } from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";

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
  const { casesByStatus, casesBySession, casesBySupervisor, casesByInitialContact } = clinicalData;

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

      <ChartCard title="Clinical Sessions">
        {casesBySession.length ? (
          <ColumnChart
            label="Clinical sessions, by session"
            series={[{ name: "Sessions", color: seriesColor(0) }]}
            categories={casesBySession.map(({ name, value }) => ({ name, values: [value] }))}
          />
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Cases by Supervisor">
        {casesBySupervisor.length ? (
          <BarList
            label="Clinical cases, by supervisor"
            rows={casesBySupervisor.toSorted((first, second) => second.value - first.value)}
          />
        ) : null}
      </ChartCard>

      <ChartCard title="Clinical Cases by Initial Contact">
        {casesByInitialContact.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Clinical cases"
            slices={casesByInitialContact.map(({ name, value }, index) => ({
              name,
              value,
              color: seriesColor(index),
            }))}
          />
        ) : null}
      </ChartCard>
    </div>
  );
}
