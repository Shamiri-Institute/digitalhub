"use client";

import { Skeleton } from "#/components/ui/skeleton";

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
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-24" />
            ))}
            <Skeleton className="h-6 w-12 ml-auto" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              {[...Array(6)].map((_, j) => (
                <Skeleton key={j} className="h-5 w-24" />
              ))}
              <Skeleton className="h-5 w-12 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
