"use client";

import { ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";

import { Icons } from "#/components/icons";
import { deferred } from "#/components/deferred";
import type { SiblingHub } from "../queries";

// The switcher pulls in cmdk and Base UI's Popover, so it loads after the page; its trigger is
// drawn until then.
const HubSwitcher = deferred(() => import("./hub-switcher").then((mod) => mod.HubSwitcher));

export default function HubBreadcrumb({
  hubs,
  currentHub,
}: {
  hubs: SiblingHub[];
  currentHub: SiblingHub;
}) {
  const router = useRouter();
  const tab = useSelectedLayoutSegment();
  const hubPath = (hubId: string) => `/admin/hubs/${hubId}${tab ? `/${tab}` : ""}`;

  const currentIndex = hubs.findIndex((h) => h.id === currentHub.id);
  const previousHub = hubs[currentIndex - 1];
  const nextHub = hubs[currentIndex + 1];

  return (
    <nav aria-label="Breadcrumb">
      <div className="flex items-center gap-x-5 text-muted-foreground">
        <button
          type="button"
          aria-label="Back"
          className="arrow-button shrink-0 rounded-lg"
          onClick={() => router.back()}
        >
          <Icons.arrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/admin/hubs" className="shrink-0 rounded-sm hover:text-primary">
            Hubs
          </Link>
          <span aria-hidden>/</span>
          <HubSwitcher
            trigger={
              <button
                type="button"
                className="flex min-w-0 cursor-pointer items-center gap-2 rounded-sm font-semibold text-foreground"
              >
                <span className="max-w-64 truncate">{currentHub.hubName}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="sr-only">, switch hub</span>
              </button>
            }
            hubs={hubs}
            currentHub={currentHub}
            hubPath={hubPath}
          />
          <div className="ml-1 flex shrink-0 gap-2">
            <SiblingLink hub={previousHub} label="Previous hub" href={hubPath}>
              <ChevronLeft className="h-4 w-4" />
            </SiblingLink>
            <SiblingLink hub={nextHub} label="Next hub" href={hubPath}>
              <ChevronRight className="h-4 w-4" />
            </SiblingLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

function SiblingLink({
  hub,
  label,
  href,
  children,
}: {
  hub: SiblingHub | undefined;
  label: string;
  href: (hubId: string) => string;
  children: React.ReactNode;
}) {
  if (!hub) {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        className="arrow-button pointer-events-none rounded-lg opacity-50"
      >
        {children}
      </button>
    );
  }
  return (
    <Link
      href={href(hub.id)}
      aria-label={`${label}: ${hub.hubName}`}
      className="arrow-button rounded-lg"
    >
      {children}
    </Link>
  );
}
