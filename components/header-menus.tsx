"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { toastOnError } from "#/components/ui/use-toast";
import { signOut } from "#/lib/auth-client";

function AccountItems({ onOpenProfile }: { onOpenProfile: () => void }) {
  return (
    <>
      <DropdownMenuItem className="gap-2 px-4 py-3 lg:px-2 lg:py-1.5" onClick={onOpenProfile}>
        <UserRound className="size-4 text-muted-foreground" />
        My Profile
      </DropdownMenuItem>
      <DropdownMenuItem
        className="gap-2 px-4 py-3 lg:px-2 lg:py-1.5"
        onClick={toastOnError(signOut)}
      >
        <LogOut className="size-4 text-muted-foreground" />
        Sign out
      </DropdownMenuItem>
    </>
  );
}

export function AccountMenu({
  trigger,
  onOpenProfile,
}: {
  trigger: React.ReactElement;
  onOpenProfile: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="w-40 max-w-none">
        <AccountItems onOpenProfile={onOpenProfile} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PhoneMenu({
  trigger,
  avatar,
  displayName,
  switchers,
  onOpenProfile,
}: {
  trigger: React.ReactElement;
  avatar: React.ReactNode;
  displayName: string;
  switchers: React.ReactNode;
  onOpenProfile: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-sm">
        <DropdownMenuLabel className="flex items-center gap-4 px-4 font-normal">
          {avatar}
          <span className="min-w-0 truncate text-base text-muted-foreground">{displayName}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {switchers && (
          <>
            {switchers}
            <DropdownMenuSeparator />
          </>
        )}
        <AccountItems onOpenProfile={onOpenProfile} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ReportingMenu({
  trigger,
  mainRoute,
}: {
  trigger: React.ReactElement;
  mainRoute: string;
}) {
  const reports = [
    ["expenses/fellows", "Expenses"],
    ["school-reports", "School Reports"],
    ["fellow-reports", "Fellow Reports"],
    ...(mainRoute === "sc" || mainRoute === "hc"
      ? [["monitoring-and-evaluation", "Monitoring and Evaluation"]]
      : []),
    ...(mainRoute === "sc" ? [["recordings", "Session Recordings"]] : []),
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="start">
        {reports.map(([path, label]) => (
          <DropdownMenuLinkItem
            key={path}
            render={<Link href={`/${mainRoute}/reporting/${path}`}>{label}</Link>}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
