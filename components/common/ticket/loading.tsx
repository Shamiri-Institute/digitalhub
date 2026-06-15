"use client";

import { Skeleton } from "#/components/ui/skeleton";

const HEADER_KEYS = ["h1", "h2", "h3", "h4", "h5", "h6"];
const ROW_KEYS = ["r1", "r2", "r3", "r4", "r5"];
const CELL_KEYS = ["c1", "c2", "c3", "c4", "c5", "c6"];

export default function TicketsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-lg border bg-white">
        <div className="border-b">
          <div className="flex gap-4 p-4">
            {HEADER_KEYS.map((key) => (
              <Skeleton key={key} className="h-6 w-24" />
            ))}
            <Skeleton className="h-6 w-12 ml-auto" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {ROW_KEYS.map((rowKey) => (
            <div key={rowKey} className="flex gap-4 items-center">
              {CELL_KEYS.map((cellKey) => (
                <Skeleton key={`${rowKey}-${cellKey}`} className="h-5 w-24" />
              ))}
              <Skeleton className="h-5 w-12 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
