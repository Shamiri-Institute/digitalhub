"use client";

import { formatInTimeZone } from "date-fns-tz";
import type { ReactNode } from "react";

import { Badge, type BadgeProps } from "#/components/ui/badge";
import type { FullTicket, TicketEvent, TicketPerson } from "#/lib/actions/ticket/types";
import { cn } from "#/lib/utils";
import { capitalise } from "./format";
import { Person } from "./person";

const eventBadge: Record<
  Exclude<TicketEvent["kind"], "CLOSED">,
  { label: string; variant: BadgeProps["variant"] }
> = {
  CREATED: { label: "Reported", variant: "outline-solid" },
  STARTED: { label: "Started", variant: "default" },
  PRIORITY_CHANGED: { label: "Priority", variant: "warning" },
  ESCALATED: { label: "Escalated", variant: "destructive" },
  REASSIGNED: { label: "Reassigned", variant: "outline-solid" },
  RESOLVED: { label: "Resolved", variant: "shamiri-green" },
  REOPENED: { label: "Reopened", variant: "warning" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
};

function changeOf(event: TicketEvent, events: TicketEvent[], viewerId: string): ReactNode {
  const sentTo = (person?: TicketPerson | null) =>
    person && (
      <>
        Sent to <Person person={person} viewerId={viewerId} emphasis={false} />
      </>
    );
  const to = sentTo(event.assignee);
  switch (event.kind) {
    case "CREATED":
    case "ESCALATED":
    case "REASSIGNED":
      return to;
    case "REOPENED":
      // A reopen records no assignee when the ticket goes back to whoever last resolved it.
      return (
        to ??
        sentTo(events.slice(0, events.indexOf(event)).findLast((e) => e.kind === "RESOLVED")?.actor)
      );
    case "PRIORITY_CHANGED":
      return event.fromValue && event.toValue
        ? `${capitalise(event.fromValue)} to ${capitalise(event.toValue)}`
        : null;
    default:
      return null;
  }
}

/** The ticket's story in one panel: the report, then every event, oldest first. */
export function TicketActivity({
  ticket,
  events,
  viewerId,
  timeZone,
}: {
  ticket: FullTicket;
  events: TicketEvent[];
  viewerId: string;
  /** Null until the browser has sent it; days and times are left out until then. */
  timeZone: string | null;
}) {
  const inZone = (event: TicketEvent, pattern: string) =>
    timeZone ? formatInTimeZone(event.createdAt, timeZone, pattern) : "";
  // Not Map.groupBy: it needs Safari 17.4 or Chrome 117, newer than the phones some staff use.
  const days = new Map<string, TicketEvent[]>();
  for (const event of events) {
    const day = inZone(event, "EEE d MMM yyyy");
    days.set(day, [...(days.get(day) ?? []), event]);
  }

  return (
    <section aria-labelledby="activity" className="overflow-hidden rounded-lg border bg-white">
      {/* Focus lands here after an action, when the button that took it is gone. */}
      <h2
        id="activity"
        tabIndex={-1}
        className="border-b bg-background-secondary px-4 py-2.5 font-semibold text-shamiri-black focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shamiri-new-blue"
      >
        Activity
      </h2>
      <ol aria-label="Activity" className="divide-y">
        {[...days].map(([day, dayEvents]) => (
          <li key={day}>
            {day && (
              <h3 className="bg-background-secondary px-4 py-1.5 text-sm font-medium text-shamiri-text-dark-grey">
                {day}
              </h3>
            )}
            <ol className="divide-y border-t">
              {dayEvents.map((event) => (
                <li
                  key={event.id}
                  className="grid gap-x-3 gap-y-0.5 px-4 py-3 sm:grid-cols-[3.5rem_minmax(0,1fr)]"
                >
                  <time
                    dateTime={new Date(event.createdAt).toISOString()}
                    className="text-sm tabular-nums leading-6 text-shamiri-text-dark-grey"
                  >
                    {inZone(event, "HH:mm")}
                  </time>
                  <EventBody event={event} events={events} ticket={ticket} viewerId={viewerId} />
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EventBody({
  event,
  events,
  ticket,
  viewerId,
}: {
  event: TicketEvent;
  events: TicketEvent[];
  ticket: FullTicket;
  viewerId: string;
}) {
  if (event.kind === "CLOSED" || !event.actor) {
    return (
      <p className="leading-6 text-shamiri-text-dark-grey">
        {event.kind === "CLOSED"
          ? "Closed automatically when the reopen window ended"
          : capitalise(event.kind)}
      </p>
    );
  }

  const badge = eventBadge[event.kind];
  const change = changeOf(event, events, viewerId);
  // A new ticket's reason is its description, so the report shows the description instead.
  const isReport = event.kind === "CREATED";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-6">
        <Badge variant={badge.variant} className="select-none">
          {badge.label}
        </Badge>
        <Person person={event.actor} viewerId={viewerId} />
        {change && <span className="text-shamiri-black">{change}</span>}
      </div>
      {isReport ? (
        <p
          className={cn(
            "max-w-prose whitespace-pre-line text-pretty",
            ticket.description ? "text-shamiri-black" : "text-shamiri-text-dark-grey",
          )}
        >
          {ticket.description || "No description given."}
        </p>
      ) : (
        event.reason && (
          <p className="max-w-prose whitespace-pre-line border-l-2 pl-3 text-pretty text-shamiri-black">
            {event.reason}
          </p>
        )
      )}
    </div>
  );
}
