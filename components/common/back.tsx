"use client";

import { useRouter } from "next/navigation";

import { Icons } from "#/components/icons";

export function Back() {
  const router = useRouter();

  return (
    <button
      className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      onClick={() => router.back()}
    >
      <Icons.chevronLeft className="h-6 w-6 align-baseline text-brand" />
      <span className="sr-only">Back</span>
    </button>
  );
}
