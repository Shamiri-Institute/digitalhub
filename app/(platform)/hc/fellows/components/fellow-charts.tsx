"use client";

import type { Prisma } from "@prisma/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { generateRandomColor } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";
import { SCHOOL_DATA_COMPLETENESS_COLOR_MAPPING } from "#/lib/app-constants/constants";

export default function FellowsCharts({
  attendanceData,
  dropoutData,
  fellowsDataCompletenessPercentage,
  fellowsSessionRatings,
}: {
  attendanceData: (Prisma.PickEnumerable<
    Prisma.InterventionSessionGroupByOutputType,
    "sessionType"[]
  > & {
    _count: {
      sessionType: number;
    };
  })[];
  dropoutData: FellowDropoutReasonsGraphData[];
  fellowsDataCompletenessPercentage: Awaited<ReturnType<typeof fetchFellowDataCompletenessData>>;
  fellowsSessionRatings: FellowSessionRatingAverages[];
}) {
  const formattedAttendanceData = attendanceData
    .filter((session) => session?.sessionType && /^s[0-4]$/i.test(session.sessionType))
    .map((session) => ({
      sessionType: session.sessionType,
      attendance: session._count.sessionType,
    }));

  const randomColors = dropoutData.map(() => generateRandomColor());
  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <ChartCard title="Attendances" showCardFooter={false}>
        {formattedAttendanceData?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart width={307} height={307} data={formattedAttendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sessionType" />
              <YAxis dataKey="attendance" />
              <Tooltip labelFormatter={(value) => `Session: ${value}`} />
              <Bar dataKey="attendance" stackId="a" fill="#0085FF" label="Attendance count" />
              <Bar dataKey="sessionType" stackId="a" fill="#CCE7FF" label="Session type" />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Drop out reasons" showCardFooter={false}>
        {dropoutData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={dropoutData}
                dataKey="value"
                nameKey="name"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
                fill="#8884d8"
              >
                <Label
                  position="center"
                  className="text-2xl font-semibold leading-8 text-shamiri-black"
                >
                  {dropoutData.reduce((acc, val) => acc + val.value, 0)}
                </Label>
                {dropoutData.map((reason, index) => (
                  <Cell key={index} fill={randomColors[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Fellows information completion" showCardFooter={false}>
        {fellowsDataCompletenessPercentage.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={250} height={250}>
              <Pie
                data={fellowsDataCompletenessPercentage}
                dataKey="value"
                nameKey="name"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
              >
                <Label
                  position="center"
                  className="text text-2xl font-semibold leading-8"
                  fill="#fffff"
                >
                  {fellowsDataCompletenessPercentage.find((d) => (d.name = "actual"))?.value + "%"}
                </Label>
                {fellowsDataCompletenessPercentage.map(({ name }) => (
                  <Cell
                    key={name}
                    // @ts-ignore
                    fill={SCHOOL_DATA_COMPLETENESS_COLOR_MAPPING[name]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Ratings" showCardFooter={false}>
        {fellowsSessionRatings?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={307} height={307} data={fellowsSessionRatings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session_date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="behaviour_rating" stroke="#0085FF" label="Behaviour" />
              <Line dataKey="program_delivery_rating" stroke="#00BA34" label="Program delivery" />
              <Line
                dataKey="dressing_and_grooming_rating"
                stroke="#F98600"
                label="Dressing and grooming"
              />
              <Line dataKey="punctuality_rating" stroke="#8884d8" label="Punctuality" />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
