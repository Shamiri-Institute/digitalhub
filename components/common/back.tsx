"use client";

import { Icons } from "#/components/icons";

export function Back() {
  return (
    <button
      className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      onClick={() => window.history.back()}
    >
      <Icons.chevronLeft className="h-6 w-6 align-baseline text-brand" />
      <span className="sr-only">Back</span>
    </button>
  );
}
