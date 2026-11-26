"use client";

import { formatInTimeZone } from "date-fns-tz";
import { EyeOff } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Badge, type BadgeProps } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/use-toast";
import { hideTicketComment } from "#/lib/actions/ticket/comments";
import type { FullTicket, TicketEvent, TicketPerson } from "#/lib/actions/ticket/types";
import { cn } from "#/lib/utils";
import { personName, sentenceLabel } from "./format";
import { Person } from "./person";
import { TicketFileList } from "./ticket-files";

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
  COMMENTED: { label: "Comment", variant: "outline-solid" },
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
        ? `${sentenceLabel(event.fromValue)} to ${sentenceLabel(event.toValue)}`
        : null;
    default:
      return null;
  }
}

export function TicketActivity({
  ticket,
  events,
  viewerId,
  timeZone,
  canComment,
}: {
  ticket: FullTicket;
  events: TicketEvent[];
  viewerId: string;
  /** Null until the browser has sent it; days and times are left out until then. */
  timeZone: string | null;
  canComment: boolean;
}) {
  const atTime = (date: Date, pattern: string) =>
    timeZone ? formatInTimeZone(date, timeZone, pattern) : "";
  const inZone = (event: TicketEvent, pattern: string) => atTime(event.createdAt, pattern);
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
                  {event.kind === "COMMENTED" ? (
                    <CommentBody
                      event={event}
                      viewerId={viewerId}
                      canHide={canComment && event.actor?.userId === viewerId}
                      hiddenAt={event.archivedAt && atTime(event.archivedAt, "HH:mm")}
                    />
                  ) : (
                    <EventBody event={event} events={events} ticket={ticket} viewerId={viewerId} />
                  )}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CommentBody({
  event,
  viewerId,
  canHide,
  hiddenAt,
}: {
  event: TicketEvent;
  viewerId: string;
  canHide: boolean;
  /** The time it was hidden, in the viewer's zone, or null while it shows. */
  hiddenAt: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  if (event.archivedAt) {
    return (
      <p className="flex items-center gap-2 leading-6 text-shamiri-text-dark-grey">
        <EyeOff aria-hidden className="h-4 w-4 shrink-0" />
        Comment hidden by {event.archivedBy ? personName(event.archivedBy, viewerId) : "its author"}
        {hiddenAt && ` · ${hiddenAt}`}
      </p>
    );
  }

  const hide = async () => {
    setIsHiding(true);
    const result = await hideTicketComment(event.id);
    setIsHiding(false);
    toast({ variant: result.success ? "default" : "destructive", description: result.message });
    if (result.success) setConfirming(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-6">
        <Badge variant="outline-solid" className="select-none">
          Comment
        </Badge>
        {event.actor && <Person person={event.actor} viewerId={viewerId} />}
        {canHide && !confirming && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1.5 text-sm text-shamiri-text-dark-grey"
            onClick={() => setConfirming(true)}
          >
            <EyeOff aria-hidden className="h-3.5 w-3.5" />
            Hide
          </Button>
        )}
      </div>
      {event.reason && (
        <p className="max-w-prose whitespace-pre-line text-pretty text-shamiri-black">
          {event.reason}
        </p>
      )}
      {event.attachments.length > 0 && <TicketFileList attachments={event.attachments} />}
      {confirming && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-background-secondary px-3 py-2 text-sm">
          <p className="min-w-0 flex-1 text-pretty text-shamiri-text-dark-grey">
            Others will see that you hid it. This can't be undone.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isHiding}
              onClick={() => setConfirming(false)}
            >
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isHiding}
              loading={isHiding}
              onClick={() => void hide()}
            >
              Hide comment
            </Button>
          </div>
        </div>
      )}
    </div>
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
          : sentenceLabel(event.kind)}
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
