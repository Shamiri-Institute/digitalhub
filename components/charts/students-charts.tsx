import type { student } from "#/db/schema";
import {
  categoryColor,
  possibleInterventionSessions,
  sessionLabel,
} from "#/components/charts/constants";
import {
  ColumnChart,
  CompletionRing,
  LineChart,
  RingBreakdown,
} from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";
import { STUDENT_DROPOUT_REASONS } from "#/lib/app-constants/constants";

const formatRating = (value: number) => value.toFixed(2);

export default function HubStudentsDetailsCharts({
  studentsAttendanceGroupedBySession,
  studentsDropOutReasonsGroupedByReason,
  studentInfoCompletion = [],
  studentGroupRatings = [],
}: {
  studentsAttendanceGroupedBySession: {
    sessionType: string | null;
    count: number;
  }[];
  studentsDropOutReasonsGroupedByReason: {
    dropOutReason: (typeof student.$inferSelect)["dropOutReason"];
    count: number;
  }[];
  studentInfoCompletion?: { name: string; value: number }[];
  studentGroupRatings?: { session: string; value: number }[];
}) {
  const attendanceBySession = possibleInterventionSessions.map((session) => ({
    name: sessionLabel(session),
    values: [
      studentsAttendanceGroupedBySession.find(({ sessionType }) => sessionType === session)
        ?.count ?? 0,
    ],
  }));

  // Reasons typed by hand differ in case and spacing; count them as one.
  const dropOutReasons = studentsDropOutReasonsGroupedByReason.reduce<
    { name: string; value: number }[]
  >((reasons, { dropOutReason, count }) => {
    const name = dropOutReason ?? "";
    const existing = reasons.find(
      (reason) => reason.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    return existing
      ? reasons.map((reason) =>
          reason === existing ? { ...reason, value: reason.value + count } : reason,
        )
      : [...reasons, { name, value: count }];
  }, []);

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Attendance">
        <ColumnChart
          label="Attendance, by session"
          series={[{ name: "Attendance", color: "var(--color-primary)" }]}
          categories={attendanceBySession}
        />
      </ChartCard>
      <ChartCard title="Drop-out reasons">
        {dropOutReasons.some(({ value }) => value > 0) ? (
          <RingBreakdown
            label="Students dropped out"
            slices={dropOutReasons
              .map(({ name, value }) => ({
                name,
                value,
                color: categoryColor(name, STUDENT_DROPOUT_REASONS),
              }))
              .toSorted((first, second) => second.value - first.value)}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="Student information completion">
        {studentInfoCompletion.length ? (
          <CompletionRing
            label="Student information complete"
            percentage={studentInfoCompletion.find(({ name }) => name === "actual")?.value ?? 0}
          />
        ) : null}
      </ChartCard>
      <ChartCard title="Student group ratings">
        {studentGroupRatings.length ? (
          <LineChart
            label="Average student group rating, by session"
            series={[{ name: "Average rating", color: "var(--color-primary)" }]}
            minimumTop={5}
            formatValue={formatRating}
            categories={studentGroupRatings.map(({ session, value }) => ({
              name: sessionLabel(session),
              values: [value],
            }))}
          />
        ) : null}
      </ChartCard>
    </div>
  );
}
