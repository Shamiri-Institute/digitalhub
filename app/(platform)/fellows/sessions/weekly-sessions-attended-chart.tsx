import { ordinalSuffixOf } from "#/lib/utils";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SessionData {
  week: string;
  sessions: number | null;
}

const processData = (data: SessionData[]): SessionData[] => {
  const completeData = [];
  for (let i = 1; i <= 5; i++) {
    const weekData = data.find((d) => d.week === `${ordinalSuffixOf(i)}`);
    if (weekData) {
      completeData.push(weekData);
    } else {
      completeData.push({ week: `${ordinalSuffixOf(i)}`, sessions: null });
    }
  }
  return completeData;
};

export function WeeklySessionsAttendedChart({ data }: { data: SessionData[] }) {
  const processedData = processData(data);

  return (
    <>
      <div className="flex justify-center">
        <h2 className="mb-2 ml-[50px] text-base font-medium text-brand">
          Number of sessions attended per week
        </h2>
      </div>
      <ResponsiveContainer width="100%" height="60%">
        <LineChart data={processedData}>
          <CartesianGrid
            horizontal={true}
            vertical={false}
            strokeDasharray="3 3"
          />
          <XAxis dataKey="week" />
          <YAxis
            allowDecimals={false}
            tickFormatter={(value) => (value % 2 === 0 ? value : "")}
            interval="preserveStartEnd"
          />
          <Tooltip
            labelFormatter={(label, payload) => {
              if (payload?.length) {
                return `${label} week`;
              }
              return "";
            }}
            formatter={(value, _) => [value, "Sessions Attended"]}
          />
          {/* <Legend /> */}
          <Line
            type="monotone"
            dataKey="sessions"
            label="Sessions Attended"
            stroke="#002244"
            strokeWidth={2}
            activeDot={{ r: 8 }}
            dot={{ fill: "#002244", r: 6 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
