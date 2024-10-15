"use client";

import { Icons } from "#/components/icons";

export function Header({
  personnelName,
  hubName,
  roleName,
}: {
  personnelName: string;
  hubName: string;
  roleName: string;
}) {
  return (
    <header className="mb-4">
      <div className="flex items-center">
        <h1 className="pr-3 text-2xl font-semibold text-brand">
          Hi, {personnelName}
        </h1>
        <Icons.smileyface className="h-6 w-6 text-brand" />
      </div>
      <p className="text-xl text-muted-foreground">
        {roleName} — {hubName} Hub
      </p>
    </header>
  );
}
