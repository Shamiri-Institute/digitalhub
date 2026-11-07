"use client";

import { Check, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";

import { Icons } from "#/components/icons";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "#/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { cn } from "#/lib/utils";
import type { SiblingHub } from "../queries";

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
      <div className="flex items-center gap-x-5 text-shamiri-text-dark-grey">
        <button
          type="button"
          aria-label="Back"
          className="arrow-button shrink-0 rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue/60"
          onClick={() => router.back()}
        >
          <Icons.arrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/admin/hubs"
            className="shrink-0 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue/60 hover:text-shamiri-new-blue"
          >
            Hubs
          </Link>
          <span aria-hidden>/</span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 cursor-pointer items-center gap-2 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue/60 font-semibold text-foreground"
              >
                <span className="max-w-64 truncate">{currentHub.hubName}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="sr-only">, switch hub</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command
                defaultValue={currentHub.hubName}
                // cmdk's Enter runs onSelect, not a click; click the link so the leave guard can stop it.
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  const selected = event.currentTarget.querySelector<HTMLElement>(
                    '[cmdk-item][aria-selected="true"]',
                  );
                  if (!selected) return;
                  event.preventDefault();
                  selected.click();
                }}
              >
                <span className="px-4 pb-1 pt-2 text-xs uppercase tracking-widest text-muted-foreground">
                  switch hub
                </span>
                <CommandSeparator />
                <CommandInput placeholder="Search hubs..." className="h-9" />
                <CommandList className="max-h-[300px] overflow-y-scroll">
                  {hubs.map((h) => (
                    <CommandItem
                      key={h.id}
                      value={h.hubName}
                      asChild
                      className="flex items-center justify-between gap-3 rounded-none border-b border-grey-border px-3 last:border-b-0"
                    >
                      <Link href={hubPath(h.id)}>
                        <span className="font-medium">{h.hubName}</span>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            h.id === currentHub.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </Link>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
      className="arrow-button rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue/60"
    >
      {children}
    </Link>
  );
}
