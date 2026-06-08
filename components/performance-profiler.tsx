"use client";

import * as React from "react";

const onRender: React.ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  console.group(
    `%c[Profiler] ${id} — ${phase}`,
    "color: #0085FF; font-weight: bold",
  );
  console.table({
    "Actual (ms)": actualDuration.toFixed(2),
    "Base (ms)": baseDuration.toFixed(2),
    "Start": startTime.toFixed(2),
    "Commit": commitTime.toFixed(2),
  });
  console.groupEnd();
};

export function PerformanceProfiler({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    return <>{children}</>;
  }

  return (
    <React.Profiler id={id} onRender={onRender}>
      {children}
    </React.Profiler>
  );
}
