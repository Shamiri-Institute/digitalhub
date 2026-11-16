import { CASE_STATUS_COLORS, categoryColor, possibleSessions } from "#/components/charts/constants";
import { BarList, ColumnChart, RingBreakdown } from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";
import { caseStatusOptions } from "#/db/enums";
import type { StudentClinicalStats } from "#/lib/actions/clinical/students";

const INITIAL_CONTACTS = ["student", "fellow", "supervisor", "teacher"];

export default function HubStudentClinicalDataCharts({
  clinicalStats,
}: {
  clinicalStats: StudentClinicalStats;
}) {
  const caseStatusCounts = Object.values(caseStatusOptions)
    .map((status) => ({
      name: status === "FollowUp" ? "Follow-up" : status,
      value: clinicalStats.casesByStatus[status] ?? 0,
      color: CASE_STATUS_COLORS[status],
    }))
    .filter(({ value }) => value > 0);

  const sessionCounts = possibleSessions.map((session) => ({
    name: session,
    values: [clinicalStats.sessionsBySession.find((item) => item.session === session)?.count ?? 0],
  }));

  const casesByInitialContact = clinicalStats.casesByReferredFrom
    .filter(({ count }) => count > 0)
    .map(({ initialReferredFromSpecified, count }) => ({
      name: initialReferredFromSpecified
        ? initialReferredFromSpecified.charAt(0).toUpperCase() +
          initialReferredFromSpecified.slice(1)
        : "Not recorded",
      value: count,
      color: categoryColor(initialReferredFromSpecified ?? "", INITIAL_CONTACTS),
    }));

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Clinical cases by case status">
        {caseStatusCounts.length ? (
          <RingBreakdown label="Clinical cases" slices={caseStatusCounts} />
        ) : null}
      </ChartCard>
      <ChartCard title={`Clinical sessions (${clinicalStats.sessionCount})`}>
        <ColumnChart
          label="Clinical sessions, by session"
          series={[{ name: "Sessions", color: "var(--color-primary)" }]}
          categories={sessionCounts}
        />
      </ChartCard>
      <ChartCard title="Clinical cases by supervisor">
        {clinicalStats.casesBySupervisor.length ? (
          <BarList
            label="Clinical cases, by supervisor"
            rows={clinicalStats.casesBySupervisor
              .map(({ supervisorName, count }) => ({ name: supervisorName, value: count }))
              .toSorted((first, second) => second.value - first.value)}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="Clinical cases by initial contact">
        {casesByInitialContact.length ? (
          <RingBreakdown label="Clinical cases" slices={casesByInitialContact} />
        ) : null}
      </ChartCard>
    </div>
  );
}
