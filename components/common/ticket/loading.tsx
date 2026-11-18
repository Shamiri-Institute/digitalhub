"use client";

import { ImplementerRole } from "#/db/enums";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import PageHeading from "#/components/ui/page-heading";
import { Skeleton } from "#/components/ui/skeleton";
import { isEscalationInitiatorRole } from "#/lib/actions/ticket/types";
import { cn } from "#/lib/utils";
import { columns, hiddenTicketColumns } from "./columns";
import CreateTicketDialog from "./create-ticket-dialog";

export default function TicketsLoading({
  userRole = ImplementerRole.FELLOW,
  rows = 5,
  bare = false,
}: {
  userRole?: ImplementerRole;
  rows?: number;
  bare?: boolean;
}) {
  return (
    <div className={cn("w-full space-y-6", !bare && "container py-10")}>
      <PageHeading title="Tickets" />
      <Skeleton className="h-26.5 w-full rounded-lg" />
      <DatatableSkeleton
        rows={rows}
        columns={columns("", null, null)}
        columnVisibilityState={hiddenTicketColumns}
        renderTableActions={
          isEscalationInitiatorRole(userRole) ? <CreateTicketDialog disabled /> : null
        }
      />
    </div>
  );
}

export function TicketLoading({ bare = false }: { bare?: boolean }) {
  return (
    <div className={cn("w-full space-y-6", !bare && "container py-10")}>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-12 w-2/3" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <Skeleton className="h-96 w-full rounded-lg" />
        <Skeleton className="-order-1 h-105 w-full rounded-lg lg:order-none" />
      </div>
    </div>
  );
}
