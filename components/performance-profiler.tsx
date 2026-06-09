"use client";

import * as React from "react";

const profilerStats = new Map<
  string,
  { totalTime: number; renderCount: number; timeoutId: ReturnType<typeof setTimeout> | null }
>();

const onRender: React.ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  const color = actualDuration < 16 ? "#00BA34" : actualDuration < 50 ? "#F59E0B" : "#E92C2C";

  console.log(
    `%c[${id}] ${phase}: ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`,
    `color: ${color}; font-weight: bold`,
  );

  let stats = profilerStats.get(id);
  if (!stats) {
    stats = { totalTime: 0, renderCount: 0, timeoutId: null };
    profilerStats.set(id, stats);
  }
  stats.totalTime += actualDuration;
  stats.renderCount++;

  if (stats.timeoutId) {
    clearTimeout(stats.timeoutId);
  }
  stats.timeoutId = setTimeout(() => {
    const finalStats = profilerStats.get(id);
    if (!finalStats) return;
    console.log(
      `%c[${id}] SUMMARY: ${finalStats.renderCount} renders | ${finalStats.totalTime.toFixed(2)}ms total | ${(finalStats.totalTime / finalStats.renderCount).toFixed(2)}ms avg`,
      "color: #0085FF; font-weight: bold; font-size: 12px",
    );
    finalStats.totalTime = 0;
    finalStats.renderCount = 0;
  }, 2000);
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
