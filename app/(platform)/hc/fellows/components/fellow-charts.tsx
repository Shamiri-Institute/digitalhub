"use client";

import type { interventionSession } from "#/db/schema";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  FellowDropoutReasonsGraphData,
  FellowSessionRatingAverages,
  fetchFellowDataCompletenessData,
} from "#/app/(platform)/hc/fellows/actions";
import { categoryColor, sessionLabel } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import { FELLOW_DROP_OUT_REASONS } from "#/lib/app-constants/constants";

export default function FellowsCharts({
  attendanceData,
  dropoutData,
  fellowsDataCompletenessPercentage,
  fellowsSessionRatings,
}: {
  attendanceData: {
    sessionType: (typeof interventionSession.$inferSelect)["sessionType"];
    count: number;
  }[];
  dropoutData: FellowDropoutReasonsGraphData[];
  fellowsDataCompletenessPercentage: Awaited<ReturnType<typeof fetchFellowDataCompletenessData>>;
  fellowsSessionRatings: FellowSessionRatingAverages[];
}) {
  const formattedAttendanceData = attendanceData
    .filter((session) => session?.sessionType && /^s[0-4]$/i.test(session.sessionType))
    .map((session) => ({
      sessionType: session.sessionType,
      attendance: session.count,
    }));

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartCard title="Attendances" showCardFooter={false}>
        {formattedAttendanceData?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              width={307}
              height={307}
              data={formattedAttendanceData}
              aria-label="Attendances"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sessionType" tickFormatter={sessionLabel} />
              <YAxis dataKey="attendance" allowDecimals={false} />
              <Tooltip labelFormatter={(value) => `Session: ${sessionLabel(String(value))}`} />
              <Bar
                dataKey="attendance"
                fill="var(--color-shamiri-new-blue)"
                name="Attendance count"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Drop out reasons" showCardFooter={false}>
        {dropoutData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Drop out reasons">
              <Pie
                data={dropoutData.map((reason) => ({
                  ...reason,
                  fill: categoryColor(reason.name, FELLOW_DROP_OUT_REASONS),
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
                  {dropoutData.reduce((acc, val) => acc + val.value, 0)}
                </Label>
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Fellows information completion" showCardFooter={false}>
        {fellowsDataCompletenessPercentage?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={250} height={250} aria-label="Fellows information completion">
              <Pie
                data={fellowsDataCompletenessPercentage.map((entry) => ({
                  ...entry,
                  fill:
                    entry.name === "actual"
                      ? "var(--color-shamiri-new-blue)"
                      : "var(--color-shamiri-new-light-blue)",
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
                  {`${fellowsDataCompletenessPercentage.find((d) => d.name === "actual")?.value}%`}
                </Label>
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Ratings" showCardFooter={false}>
        {fellowsSessionRatings?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={307} height={307} data={fellowsSessionRatings} aria-label="Ratings">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session_date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                dataKey="behaviour_rating"
                stroke="var(--color-shamiri-new-blue)"
                name="Behaviour"
              />
              <Line
                dataKey="program_delivery_rating"
                stroke="var(--color-shamiri-graph-green)"
                name="Program delivery"
              />
              <Line
                dataKey="dressing_and_grooming_rating"
                stroke="var(--color-shamiri-light-orange)"
                name="Dressing and grooming"
              />
              <Line
                dataKey="punctuality_rating"
                stroke="var(--color-shamiri-graph-purple)"
                name="Punctuality"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
