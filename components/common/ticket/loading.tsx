"use client";

import { ImplementerRole } from "@prisma/client";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { isEscalationInitiatorRole } from "#/lib/actions/ticket/types";
import { columns } from "./columns";
import CreateTicketDialog from "./create-ticket-dialog";

export default function TicketsLoading({
  userRole = ImplementerRole.FELLOW,
  rows = 5,
}: {
  userRole?: ImplementerRole;
  rows?: number;
}) {
  return (
    <DatatableSkeleton
      rows={rows}
      columns={columns({
        setTicket: () => {},
        setViewDialog: () => {},
        setResolutionDialog: () => {},
        setEscalateDialog: () => {},
        setReassignDialog: () => {},
        role: userRole,
      })}
      renderTableActions={
        isEscalationInitiatorRole(userRole) ? <CreateTicketDialog disabled /> : null
      }
    />
  );
}
