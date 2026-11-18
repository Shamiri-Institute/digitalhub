import { formatDistanceToNowStrict } from "date-fns";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import type { ImplementerRole } from "#/db/enums";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import { Badge } from "#/components/ui/badge";
import PageFooter from "#/components/ui/page-footer";
import { getAllTickets, getTicketDetails } from "#/lib/actions/ticket";
import { RESOLVED_TICKET_STATUSES } from "#/lib/actions/ticket/types";
import { formatDateIn } from "#/lib/date-utils";
import { cn } from "#/lib/utils";
import { viewerTimeZone } from "#/lib/viewer-time-zone";
import { capitalise, holdsTicket, priorityBadgeVariant, statusBadgeVariant } from "./format";
import { Person } from "./person";
import { TicketActivity } from "./ticket-activity";
import { TicketBreadcrumb } from "./ticket-breadcrumb";
import { TicketNextStep } from "./ticket-next-step";

/** One ticket's page, which every role shares under its own `basePath`. */
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
  const [result, timeZone, listedResult] = await Promise.all([
    getTicketDetails(ticketId),
    viewerTimeZone(),
    getAllTickets({}),
  ]);
  if (!result.success || !result.data) notFound();
  const { ticket, events, actions, reopenableUntil, viewerId, recipients, reassignRecipients } =
    result.data;
  const lastPriorityChange = events.findLast((e) => e.kind === "PRIORITY_CHANGED");
  const priorityVariant = priorityBadgeVariant[ticket.priority];
  const isClosed = RESOLVED_TICKET_STATUSES.includes(ticket.status);

  // Previous and next follow the list's default order, newest first, through the tickets the
  // viewer holds when they hold this one, so a holder can work through their queue.
  const listed = listedResult.data ?? [];
  const holdsThis = ticket.holder.userId === viewerId;
  const siblings = holdsThis ? listed.filter((t) => t.holder.userId === viewerId) : listed;
  const index = siblings.findIndex((t) => t.id === ticket.id);

  const body = (
    <main className={cn("w-full space-y-6", !bare && "container grow py-10")}>
      <TicketBreadcrumb
        basePath={basePath}
        visibleId={ticket.visibleId}
        previous={index > 0 ? siblings[index - 1] : undefined}
        next={index >= 0 ? siblings[index + 1] : undefined}
        scope={holdsThis ? "you hold" : undefined}
      />
      <h1 className="max-w-4xl text-2xl font-semibold leading-8 text-balance text-black sm:text-4xl sm:leading-[48px]">
        {ticket.subject}
      </h1>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <TicketActivity ticket={ticket} events={events} viewerId={viewerId} timeZone={timeZone} />
        <aside
          aria-label="Ticket details"
          className="-order-1 overflow-hidden rounded-lg border bg-white lg:sticky lg:top-6 lg:order-none"
        >
          <h2 className="border-b bg-background-secondary px-4 py-2.5 font-semibold text-shamiri-black">
            Details
          </h2>
          <dl className="grid grid-cols-[7rem_minmax(0,1fr)] text-sm [&>*]:border-b [&>*]:py-2 [&>*:nth-last-child(-n+2)]:border-b-0 [&>dd]:pr-4 [&>dt]:pl-4">
            <Detail label="Status">
              <Badge variant={statusBadgeVariant[ticket.status]} className="select-none">
                {capitalise(ticket.status)}
              </Badge>
            </Detail>
            <Detail label="Priority">
              {priorityVariant ? (
                <Badge variant={priorityVariant} className="select-none">
                  {capitalise(ticket.priority)}
                </Badge>
              ) : (
                capitalise(ticket.priority)
              )}
              {lastPriorityChange?.fromValue && (
                <Muted>from {capitalise(lastPriorityChange.fromValue)}</Muted>
              )}
            </Detail>
            <Detail
              label={
                isClosed ? "Resolved by" : ticket.status === "CANCELLED" ? "Was with" : "Held by"
              }
            >
              <Person person={ticket.holder} viewerId={viewerId} />
            </Detail>
            <Detail label="Raised by">
              <Person person={ticket.createdBy} viewerId={viewerId} />
            </Detail>
            <Detail label="Category">{capitalise(ticket.category)}</Detail>
            <Detail label="Opened">
              {timeZone && formatDateIn(ticket.createdAt, timeZone)}
              <Muted>
                {formatDistanceToNowStrict(ticket.createdAt, {
                  addSuffix: true,
                  roundingMethod: "floor",
                })}
              </Muted>
            </Detail>
          </dl>
          {(holdsTicket(actions) || actions.canReopen || actions.canCancel) && (
            <TicketNextStep
              ticket={ticket}
              actions={actions}
              role={role}
              recipients={recipients}
              reassignRecipients={reassignRecipients}
              reopenableUntil={reopenableUntil}
              timeZone={timeZone}
            />
          )}
        </aside>
      </div>
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

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-medium leading-6 text-shamiri-text-dark-grey">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-2 leading-6 break-words text-shamiri-black">
        {children}
      </dd>
    </>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-shamiri-text-dark-grey">{children}</span>;
}
