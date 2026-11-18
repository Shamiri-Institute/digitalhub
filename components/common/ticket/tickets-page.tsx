import { differenceInCalendarDays, formatDistanceToNowStrict, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import type { ImplementerRole } from "#/db/enums";
import { Figure, formatCount, Note, Notice, StatCell } from "#/components/common/stats";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import { TicketViewTabs } from "#/components/common/ticket/ticket-view-tabs";
import TicketsDatatable from "#/components/common/ticket/tickets-datatable";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { getAllTickets, getTicketAssignees } from "#/lib/actions/ticket";
import {
  ACTIVE_TICKET_STATUSES,
  ESCALATION_RECIPIENT_ROLES,
  type FullTicket,
  isEscalationInitiatorRole,
} from "#/lib/actions/ticket/types";
import { cn } from "#/lib/utils";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

const views = ["all", "held", "raised"] as const;
type TicketsView = (typeof views)[number];

export function ticketsView(view: string | string[] | undefined): TicketsView {
  return views.find((v) => v === view) ?? "all";
}

const STALE_DAYS = 7;

const notStarted = (t: FullTicket) => t.status === "OPEN" || t.status === "ESCALATED";

export default async function TicketsPage({
  role,
  userId,
  basePath,
  view,
  bare = false,
}: {
  role: ImplementerRole;
  userId: string | null;
  basePath: string;
  view: TicketsView;
  /** Leave out the container and footer, for a layout that already has them. */
  bare?: boolean;
}) {
  const [result, timeZone, assigneesResult] = await Promise.all([
    getAllTickets({}),
    viewerTimeZone(),
    isEscalationInitiatorRole(role) ? getTicketAssignees() : null,
  ]);
  const tickets = result.success ? (result.data ?? []) : [];
  const assignees = assigneesResult?.success ? assigneesResult.data : undefined;

  // The tabs list resolved tickets too, so a creator can still find one to reopen; the stats count
  // only active ones.
  const held = tickets.filter((t) => t.holder.userId === userId);
  const raised = tickets.filter((t) => t.createdBy.userId === userId);
  const isActive = (t: FullTicket) => ACTIVE_TICKET_STATUSES.includes(t.status);
  const canHold = (ESCALATION_RECIPIENT_ROLES as ImplementerRole[]).includes(role);
  const canRaise = isEscalationInitiatorRole(role);

  const tabs = [
    { view: "all", label: "All tickets", count: tickets.length },
    ...(canHold ? [{ view: "held", label: "Held by you", count: held.length }] : []),
    ...(canRaise ? [{ view: "raised", label: "Raised by you", count: raised.length }] : []),
  ];
  const viewTickets = view === "held" ? held : view === "raised" ? raised : tickets;

  const body = (
    <div className={cn("w-full space-y-6", !bare && "container grow py-10")}>
      <PageHeading title="Tickets" />
      <section
        aria-label="Ticket stats"
        className={cn(
          "grid gap-px overflow-hidden rounded-lg border bg-border",
          canHold ? "sm:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {canHold ? (
          <HolderStats tickets={tickets.filter(isActive)} timeZone={timeZone} />
        ) : (
          <CreatorStats raised={raised.filter(isActive)} />
        )}
      </section>
      {(canHold || canRaise) && <TicketViewTabs basePath={basePath} tabs={tabs} current={view} />}
      <TicketsDatatable
        tickets={viewTickets}
        role={role}
        assignees={assignees}
        basePath={basePath}
        viewerId={userId}
        timeZone={timeZone}
        emptyStateMessage={
          view === "held"
            ? "You don't hold any tickets"
            : view === "raised"
              ? "You haven't raised any tickets"
              : "No tickets yet"
        }
      />
      <ViewerTimeZoneCookie serverTimeZone={timeZone} />
    </div>
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

function HolderStats({
  tickets,
  timeZone,
}: {
  tickets: FullTicket[];
  /** Null until the browser has sent it; the stale flag is left off until then. */
  timeZone: string | null;
}) {
  const urgent = tickets.filter((t) => t.priority === "URGENT" || t.priority === "HIGH");
  const oldest = tickets.toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  const waiting = tickets.filter(notStarted);
  const escalated = waiting.filter((t) => t.status === "ESCALATED");
  const dayIn = (date: Date, zone: string) => parseISO(formatInTimeZone(date, zone, "yyyy-MM-dd"));
  const oldestIsStale =
    oldest &&
    timeZone &&
    differenceInCalendarDays(dayIn(new Date(), timeZone), dayIn(oldest.createdAt, timeZone)) >
      STALE_DAYS;

  return (
    <>
      <StatCell
        label="Urgent or high"
        info="Active tickets you can see at high or urgent priority."
      >
        <Figure value={formatCount(urgent.length)} />
        {urgent.length > 0 ? (
          <Notice tone="attention">Needs attention</Notice>
        ) : (
          <Note>None urgent</Note>
        )}
      </StatCell>
      <StatCell
        label="Oldest open"
        info="How long ago the oldest active ticket you can see was raised."
      >
        <Figure value={oldest ? formatDistanceToNowStrict(oldest.createdAt) : "–"} />
        {oldestIsStale ? (
          <Notice tone="attention">
            <span className="truncate">{oldest.subject}</span>
          </Notice>
        ) : (
          <Note>
            <span className="block truncate">{oldest ? oldest.subject : "No open tickets"}</span>
          </Note>
        )}
      </StatCell>
      <StatCell label="Not started" info="Active tickets you can see that no one has started yet.">
        <Figure value={formatCount(waiting.length)} />
        {escalated.length > 0 ? (
          <Notice tone="attention">{formatCount(escalated.length)} escalated</Notice>
        ) : (
          <Note>None escalated</Note>
        )}
      </StatCell>
    </>
  );
}

function CreatorStats({ raised }: { raised: FullTicket[] }) {
  const waiting = raised.filter(notStarted);
  return (
    <>
      <StatCell label="Waiting to start" info="Tickets you raised that no one has started yet.">
        <Figure value={formatCount(waiting.length)} />
        <Note>Raised by you</Note>
      </StatCell>
      <StatCell label="Being worked on" info="Tickets you raised that someone has started.">
        <Figure value={formatCount(raised.length - waiting.length)} />
        <Note>Raised by you</Note>
      </StatCell>
    </>
  );
}
