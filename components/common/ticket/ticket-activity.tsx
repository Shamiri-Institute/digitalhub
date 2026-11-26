"use client";

import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowLeftRight,
  ArrowUpFromLine,
  CircleCheck,
  CircleX,
  EyeOff,
  Flag,
  Lock,
  Play,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/use-toast";
import { hideTicketComment } from "#/lib/actions/ticket/comments";
import type { FullTicket, TicketEvent, TicketPerson } from "#/lib/actions/ticket/types";
import { cn } from "#/lib/utils";
import { personName, sentenceLabel } from "./format";
import { Person } from "./person";
import { TicketFileList } from "./ticket-files";

// Status changes carry the icon and colour of the composer mode that makes them; reports and
// comments carry their author's initials instead.
const eventIcon: Partial<Record<TicketEvent["kind"], { icon: LucideIcon; tone: string }>> = {
  STARTED: { icon: Play, tone: "text-shamiri-new-blue" },
  PRIORITY_CHANGED: { icon: Flag, tone: "text-shamiri-dark-orange" },
  ESCALATED: { icon: ArrowUpFromLine, tone: "text-shamiri-light-red" },
  REASSIGNED: { icon: ArrowLeftRight, tone: "text-shamiri-text-dark-grey" },
  RESOLVED: { icon: CircleCheck, tone: "text-shamiri-green" },
  REOPENED: { icon: RotateCcw, tone: "text-shamiri-dark-orange" },
  CANCELLED: { icon: CircleX, tone: "text-shamiri-text-dark-grey" },
  CLOSED: { icon: Lock, tone: "text-shamiri-text-dark-grey" },
};

/** What happened, said as a sentence after the actor's name: "commented", "reassigned it to …". */
function actionOf(event: TicketEvent, events: TicketEvent[], viewerId: string): ReactNode {
  const to = (verb: string, person?: TicketPerson | null) =>
    person ? (
      <>
        {verb} <Person person={person} viewerId={viewerId} />
      </>
    ) : (
      verb
    );
  switch (event.kind) {
    case "CREATED":
      return to("reported it to", event.assignee);
    case "STARTED":
      return "started work";
    case "PRIORITY_CHANGED":
      return event.fromValue && event.toValue
        ? `changed the priority from ${sentenceLabel(event.fromValue)} to ${sentenceLabel(event.toValue)}`
        : "changed the priority";
    case "ESCALATED":
      return to("escalated it to", event.assignee);
    case "REASSIGNED":
      return to("reassigned it to", event.assignee);
    case "RESOLVED":
      return "resolved it";
    case "REOPENED":
      // A reopen records no assignee when the ticket goes back to whoever last resolved it.
      return to(
        "reopened it for",
        event.assignee ??
          events.slice(0, events.indexOf(event)).findLast((e) => e.kind === "RESOLVED")?.actor,
      );
    case "CANCELLED":
      return "cancelled it";
    case "COMMENTED":
      return "commented";
    case "CLOSED":
      return "closed it";
  }
}

function initials(name: string | null) {
  const words = (name ?? "?").trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function Marker({ event, viewerId }: { event: TicketEvent; viewerId: string }) {
  const icon = event.archivedAt
    ? { icon: EyeOff, tone: "text-shamiri-text-grey" }
    : eventIcon[event.kind];
  if (icon || !event.actor) {
    const Icon = icon?.icon ?? Lock;
    return (
      <span aria-hidden className="grid size-7 place-items-center rounded-full border bg-white">
        <Icon className={cn("h-3.5 w-3.5", icon?.tone ?? "text-shamiri-text-grey")} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 place-items-center rounded-full text-xs font-semibold",
        event.actor.userId === viewerId
          ? "bg-shamiri-new-blue text-white"
          : "border bg-background-secondary text-shamiri-text-dark-grey",
      )}
    >
      {initials(event.actor.name)}
    </span>
  );
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
    <section
      aria-labelledby="activity"
      className="overflow-hidden rounded-lg border bg-white font-normal"
    >
      {/* Focus lands here after an action, when the button that took it is gone. */}
      <h2
        id="activity"
        tabIndex={-1}
        className="border-b bg-background-secondary px-4 py-2.5 font-sans text-sm font-semibold text-shamiri-black focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shamiri-new-blue"
      >
        Activity
      </h2>
      <ol aria-label="Activity" className="divide-y">
        {[...days].map(([day, dayEvents]) => (
          <li key={day}>
            {day && (
              <h3 className="px-4 pt-4 pb-1.5 font-sans text-xs font-medium uppercase tracking-caps text-shamiri-text-grey">
                {day}
              </h3>
            )}
            <ol className="divide-y border-t">
              {dayEvents.map((event) => (
                <li
                  key={event.id}
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 px-4 py-3 sm:grid-cols-[3rem_1.75rem_minmax(0,1fr)]"
                >
                  <time
                    dateTime={new Date(event.createdAt).toISOString()}
                    className="text-sm tabular-nums leading-7 text-shamiri-text-grey max-sm:hidden"
                  >
                    {inZone(event, "HH:mm")}
                  </time>
                  <Marker event={event} viewerId={viewerId} />
                  {event.kind === "COMMENTED" ? (
                    <CommentBody
                      event={event}
                      viewerId={viewerId}
                      canHide={canComment && event.actor?.userId === viewerId}
                      hiddenAt={event.archivedAt && atTime(event.archivedAt, "HH:mm")}
                      time={inZone(event, "HH:mm")}
                    />
                  ) : (
                    <EventBody
                      event={event}
                      events={events}
                      ticket={ticket}
                      viewerId={viewerId}
                      time={inZone(event, "HH:mm")}
                    />
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
  time,
}: {
  event: TicketEvent;
  viewerId: string;
  canHide: boolean;
  /** The time it was hidden, in the viewer's zone, or null while it shows. */
  hiddenAt: string | null;
  time: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  if (event.archivedAt) {
    return (
      <p className="text-sm leading-7 text-shamiri-text-dark-grey">
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
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 text-sm leading-7 text-shamiri-text-dark-grey">
        <span>
          {event.actor && <Person person={event.actor} viewerId={viewerId} />} commented
          <PhoneTime time={time} />
        </span>
        {canHide && !confirming && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-sm text-shamiri-text-dark-grey"
            onClick={() => setConfirming(true)}
          >
            <EyeOff aria-hidden className="h-3.5 w-3.5" />
            Hide
          </Button>
        )}
      </div>
      {event.reason && <Body>{event.reason}</Body>}
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
  time,
}: {
  event: TicketEvent;
  events: TicketEvent[];
  ticket: FullTicket;
  viewerId: string;
  time: string;
}) {
  // A new ticket's reason is its description, so the report shows the description instead.
  const isReport = event.kind === "CREATED";
  return (
    <div className="space-y-1">
      <p className="text-sm leading-7 text-shamiri-text-dark-grey">
        {event.kind === "CLOSED" ? (
          "Closed automatically when the reopen window ended"
        ) : event.actor ? (
          <>
            <Person person={event.actor} viewerId={viewerId} /> {actionOf(event, events, viewerId)}
          </>
        ) : (
          sentenceLabel(event.kind)
        )}
        <PhoneTime time={time} />
      </p>
      {isReport ? (
        // The report leads the thread, so it reads a step larger than the replies.
        <Body
          className={cn(
            "text-base leading-7",
            !ticket.description && "text-shamiri-text-dark-grey",
          )}
        >
          {ticket.description || "No description given."}
        </Body>
      ) : (
        event.reason && <Body>{event.reason}</Body>
      )}
    </div>
  );
}

function Body({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p
      className={cn(
        "max-w-prose whitespace-pre-line text-pretty text-sm leading-6 text-shamiri-black",
        className,
      )}
    >
      {children}
    </p>
  );
}

// Phones have no time column, so the time follows the line instead.
function PhoneTime({ time }: { time: string }) {
  return time ? <span className="sm:hidden"> · {time}</span> : null;
}
