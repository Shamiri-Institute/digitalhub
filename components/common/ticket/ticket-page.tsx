import { formatDistanceToNowStrict } from "date-fns";
import { notFound } from "next/navigation";

import type { ImplementerRole } from "#/db/enums";
import { Note, StatCell } from "#/components/common/stats";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import { Badge } from "#/components/ui/badge";
import PageFooter from "#/components/ui/page-footer";
import { getTicketDetails } from "#/lib/actions/ticket";
import { ACTIVE_TICKET_STATUSES, RESOLVED_TICKET_STATUSES } from "#/lib/actions/ticket/types";
import { formatDateIn, formatDateTimeIn } from "#/lib/date-utils";
import { cn } from "#/lib/utils";
import { viewerTimeZone } from "#/lib/viewer-time-zone";
import { sentenceLabel, statusBadgeVariant } from "./format";
import { Person } from "./person";
import { PriorityBadge } from "./priority-badge";
import { TicketActivity } from "./ticket-activity";
import { TicketBreadcrumb } from "./ticket-breadcrumb";
import { TicketComposer } from "./ticket-composer";

export default async function TicketPage({
  ticketId,
  role,
  basePath,
  bare = false,
}: {
  ticketId: string;
  role: ImplementerRole;
  basePath: string;
  /** Leave out the container and footer, for a layout that already has them. */
  bare?: boolean;
}) {
  const [detailsResult, timeZone] = await Promise.all([
    getTicketDetails(ticketId),
    viewerTimeZone(),
  ]);
  if (!detailsResult.success || !detailsResult.data) notFound();
  const {
    ticket,
    previous,
    next,
    events,
    actions,
    reopenableUntil,
    viewerId,
    recipients,
    reassignRecipients,
    creatorHub,
  } = detailsResult.data;
  const isActive = ACTIVE_TICKET_STATUSES.includes(ticket.status);
  const holdsThis = ticket.holder.userId === viewerId;
  // Cancelling sets no date on the ticket, so its event carries it.
  const endedAt =
    ticket.status === "RESOLVED"
      ? ticket.resolvedAt
      : ticket.status === "CLOSED"
        ? ticket.closedAt
        : (events.findLast((e) => e.kind === "CANCELLED")?.createdAt ?? null);
  const holderLabel = RESOLVED_TICKET_STATUSES.includes(ticket.status)
    ? "Resolved by"
    : ticket.status === "CANCELLED"
      ? "Last held by"
      : "Held by";
  // High and urgent tickets that still need work tint their priority, like their badge.
  const priorityTint =
    isActive &&
    {
      HIGH: "bg-linear-to-b from-shamiri-light-orange/10 to-shamiri-light-orange/10",
      URGENT:
        "bg-linear-to-b from-shamiri-light-red-background-base/10 to-shamiri-light-red-background-base/10",
    }[ticket.priority as string];

  const body = (
    <main className="flex w-full grow flex-col">
      <div className={cn("w-full grow space-y-6", !bare && "container py-10")}>
        <TicketBreadcrumb
          basePath={basePath}
          visibleId={ticket.visibleId}
          previous={previous ?? undefined}
          next={next ?? undefined}
          scope={holdsThis ? "you hold" : undefined}
        />
        <div className="space-y-2">
          <h1 className="max-w-4xl text-2xl font-semibold text-balance text-shamiri-black sm:text-4xl">
            {ticket.subject}
          </h1>
          <p className="text-sm leading-normal font-normal text-shamiri-text-dark-grey">
            {/* Who raised it and when lead the thread below, so this says only what and where. */}
            {sentenceLabel(ticket.category)} request
            {creatorHub && (
              <>
                {" "}
                from <strong className="font-semibold text-shamiri-black">{creatorHub}</strong>
              </>
            )}
          </p>
        </div>
        {/* Phones get the details as one line, so the conversation starts on the first screen. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-shamiri-text-dark-grey sm:hidden">
          <Badge variant={statusBadgeVariant[ticket.status]} className="select-none">
            {sentenceLabel(ticket.status)}
          </Badge>
          <PriorityBadge priority={ticket.priority} status={ticket.status} />
          <span>
            {holderLabel} <Person person={ticket.holder} viewerId={viewerId} />
          </span>
          {isActive && (
            <span>
              Open for {formatDistanceToNowStrict(ticket.createdAt, { roundingMethod: "floor" })}
            </span>
          )}
        </div>
        <section
          aria-label="Ticket details"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border max-sm:hidden lg:grid-cols-4"
        >
          <StatCell label="Status">
            <Badge variant={statusBadgeVariant[ticket.status]} className="select-none">
              {sentenceLabel(ticket.status)}
            </Badge>
            {reopenableUntil && timeZone && (
              <Note>Reopenable until {formatDateTimeIn(reopenableUntil, timeZone)}</Note>
            )}
          </StatCell>
          <StatCell label="Priority" className={priorityTint || undefined}>
            <PriorityBadge priority={ticket.priority} status={ticket.status} />
          </StatCell>
          <StatCell label={holderLabel}>
            <p className="text-lg">
              <Person person={ticket.holder} viewerId={viewerId} />
            </p>
          </StatCell>
          {/* The thread opens with the raised date, so a finished ticket shows when it ended. */}
          <StatCell label={isActive ? "Open for" : `${sentenceLabel(ticket.status)} on`}>
            <p className="text-lg text-shamiri-black">
              {isActive
                ? formatDistanceToNowStrict(ticket.createdAt, { roundingMethod: "floor" })
                : endedAt && timeZone && formatDateIn(endedAt, timeZone)}
            </p>
          </StatCell>
        </section>
        <TicketActivity
          ticket={ticket}
          events={events}
          viewerId={viewerId}
          timeZone={timeZone}
          canComment={actions.canComment}
        />
      </div>
      <TicketComposer
        ticket={ticket}
        actions={actions}
        role={role}
        recipients={recipients}
        reassignRecipients={reassignRecipients}
        contained={!bare}
      />
      <ViewerTimeZoneCookie serverTimeZone={timeZone} />
    </main>
  );
  return bare ? (
    body
  ) : (
    <div className="flex h-full flex-col bg-white">
      {body}
      <PageFooter />
    </div>
  );
}
