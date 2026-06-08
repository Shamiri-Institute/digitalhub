"use client";

import * as React from "react";

const onRender: React.ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  const color = actualDuration < 16 ? "#00BA34" : actualDuration < 50 ? "#F59E0B" : "#E92C2C";

  console.log(
    `%c[${id}] ${phase}: ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`,
    `color: ${color}; font-weight: bold`,
  );
};

export function PerformanceProfiler({ id, children }: { id: string; children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    return <>{children}</>;
  }

  return (
    <React.Profiler id={id} onRender={onRender}>
      {children}
    </React.Profiler>
  );
}
