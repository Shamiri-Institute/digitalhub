"use client";

import * as React from "react";

export function PerformanceProfiler({ id, children }: { id: string; children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    return <>{children}</>;
  }

  return <DevProfiler id={id}>{children}</DevProfiler>;
}

function DevProfiler({ id, children }: { id: string; children: React.ReactNode }) {
  const statsRef = React.useRef({
    totalTime: 0,
    renderCount: 0,
    timeoutId: null as ReturnType<typeof setTimeout> | null,
  });

  React.useEffect(() => {
    return () => {
      if (statsRef.current.timeoutId) {
        clearTimeout(statsRef.current.timeoutId);
      }
    };
  }, []);

  const onRender: React.ProfilerOnRenderCallback = React.useCallback(
    (id, phase, actualDuration, baseDuration) => {
      const color = actualDuration < 16 ? "#00BA34" : actualDuration < 50 ? "#F59E0B" : "#E92C2C";

      console.log(
        `%c[${id}] ${phase}: ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`,
        `color: ${color}; font-weight: bold`,
      );

      const stats = statsRef.current;
      stats.totalTime += actualDuration;
      stats.renderCount++;

      if (stats.timeoutId) {
        clearTimeout(stats.timeoutId);
      }

      stats.timeoutId = setTimeout(() => {
        console.log(
          `%c[${id}] SUMMARY: ${stats.renderCount} renders | ${stats.totalTime.toFixed(2)}ms total | ${(stats.totalTime / stats.renderCount).toFixed(2)}ms avg`,
          "color: #0085FF; font-weight: bold; font-size: 12px",
        );
        stats.totalTime = 0;
        stats.renderCount = 0;
      }, 2000);
    },
    [],
  );

  return <React.Profiler id={id} onRender={onRender}>{children}</React.Profiler>;
}
