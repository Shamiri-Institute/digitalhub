"use client";

import { useIsServerSide } from "#/lib/hooks/use-is-server-side";
import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";

interface DataItem {
  name: string;
  value: number;
}

const COLORS = ["#002244", "#B0D5EA"];

export function AttendancePieChart({
  presentCount,
  absentCount,
}: {
  presentCount: number;
  absentCount: number;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const isServerSide = useIsServerSide();
  if (isServerSide) {
    return null;
  }

  const totalCount = presentCount + absentCount;

  const data: DataItem[] = [
    { name: "Present", value: presentCount || 0 },
    { name: "Absent", value: absentCount || 1 },
  ];

  return (
    <div className="relative">
      <div className="flex justify-center">
        <PieChart width={200} height={200}>
          <Pie
            activeIndex={activeIndex}
            data={data}
            cx={100}
            cy={100}
            innerRadius={60}
            outerRadius={80}
            fill="#002244"
            dataKey="value"
            onMouseEnter={onPieEnter}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </div>
      <div className="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="flex items-end">
            {totalCount === 0 ? (
              <div className="text-4xl font-semibold">0</div>
            ) : (
              <>
                <div className="text-4xl font-semibold">{presentCount}</div>
                <div className="text-base font-medium">/{totalCount}</div>
              </>
            )}
          </div>
          <div className="mx-auto flex justify-center gap-4">
            {totalCount === 0 ? (
              <span>None</span>
            ) : (
              [
                { label: "P", color: "#002244" },
                { label: "A", color: "#B0D5EA" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center">
                  <div
                    className="mr-1 h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div className="text-zinc-400">{label}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
