"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Icons } from "#/components/icons";

type Sibling = { id: string; visibleId: number };

export function TicketBreadcrumb({
  basePath,
  visibleId,
  previous,
  next,
  scope,
}: {
  basePath: string;
  visibleId: number;
  previous?: Sibling;
  next?: Sibling;
  /** Names the tickets previous and next step through, such as "you hold". */
  scope?: string;
}) {
  const router = useRouter();
  const label = (direction: string) => `${direction} ticket${scope ? ` ${scope}` : ""}`;

  return (
    <nav aria-label="Breadcrumb">
      <div className="flex items-center gap-x-5 text-shamiri-text-dark-grey">
        <button
          type="button"
          aria-label="Back"
          className="arrow-button shrink-0 rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue"
          onClick={() => router.back()}
        >
          <Icons.arrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={basePath}
            className="shrink-0 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue hover:text-shamiri-new-blue"
          >
            Tickets
          </Link>
          <span aria-hidden>/</span>
          <span aria-current="page" className="shrink-0 font-semibold text-foreground tabular-nums">
            Ticket #{visibleId}
          </span>
          <div className="ml-1 flex shrink-0 gap-2">
            <SiblingLink ticket={previous} label={label("Previous")} basePath={basePath}>
              <ChevronLeft className="h-4 w-4" />
            </SiblingLink>
            <SiblingLink ticket={next} label={label("Next")} basePath={basePath}>
              <ChevronRight className="h-4 w-4" />
            </SiblingLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

function SiblingLink({
  ticket,
  label,
  basePath,
  children,
}: {
  ticket: Sibling | undefined;
  label: string;
  basePath: string;
  children: React.ReactNode;
}) {
  if (!ticket) {
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
      href={`${basePath}/${ticket.id}`}
      aria-label={`${label}: #${ticket.visibleId}`}
      className="arrow-button rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue"
    >
      {children}
    </Link>
  );
}
