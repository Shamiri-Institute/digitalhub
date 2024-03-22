"use client";

import ChartCard from "#/components/ui/chart-card";
import {
  SCHOOL_DATA_COMPLETENESS_COLOR_MAPPING,
  SCHOOL_DROPOUT_REASONS_MAPPING,
} from "#/lib/app-constants/constants";
import {
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
import {
  DropoutReasonsGraphData,
  SessionRatingAverages,
  fetchSchoolDataCompletenessData,
} from "../actions";

export default function ChartArea({
  dropoutData,
  schoolDataCompletenessData,
  sessionRatingsData,
}: {
  dropoutData: DropoutReasonsGraphData[];
  schoolDataCompletenessData: Awaited<
    ReturnType<typeof fetchSchoolDataCompletenessData>
  >;
  sessionRatingsData: SessionRatingAverages[];
}) {
  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <ChartCard title="Attendance" />
      <ChartCard title="Drop out reasons">
        {dropoutData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={dropoutData}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                innerRadius={50}
                fill="#8884d8"
              >
                <Label
                  position="center"
                  className="text-2xl font-semibold leading-8 text-shamiri-black"
                >
                  {dropoutData.reduce((acc, val) => acc + val.value, 0)}
                </Label>
                {dropoutData.map((reason) => (
                  <Cell
                    key={reason.name}
                    // FIXME: remove this ts-ignore to be consistent across the app
                    // @ts-ignore
                    fill={SCHOOL_DROPOUT_REASONS_MAPPING[reason.name]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="School information completion">
        {schoolDataCompletenessData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={schoolDataCompletenessData}
                dataKey="value"
                nameKey="name"
                startAngle={90}
                endAngle={450}
                outerRadius={80}
                innerRadius={50}
              >
                <Label
                  position="center"
                  className="text-2xl font-semibold leading-8 text-shamiri-black"
                >
                  {schoolDataCompletenessData.find((d) => (d.name = "actual"))
                    ?.value + "%"}
                </Label>
                {schoolDataCompletenessData.map(({ name }) => (
                  <Cell
                    key={name}
                    // FIXME: remove this ts-ignore to be consistent across the app
                    // @ts-ignore
                    fill={SCHOOL_DATA_COMPLETENESS_COLOR_MAPPING[name]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Ratings">
        {sessionRatingsData?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={307} height={307} data={sessionRatingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session_type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="student_behaviour" stroke="#0085FF" />
              <Line dataKey="admin_support" stroke="#00BA34" />
              <Line dataKey="workload" stroke="#F98600" />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
