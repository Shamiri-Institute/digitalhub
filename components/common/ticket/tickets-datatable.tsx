"use client";

import type { ImplementerRole } from "#/db/enums";
import { useState } from "react";
import {
  columns,
  type TicketData,
  type TicketDialogKind,
} from "#/components/common/ticket/columns";
import CreateTicketDialog from "#/components/common/ticket/create-ticket-dialog";
import { EscalateTicketDialog } from "#/components/common/ticket/escalate-ticket-dialog";
import { ReassignTicketDialog } from "#/components/common/ticket/reassign-ticket-dialog";
import { ResolveTicketDialog } from "#/components/common/ticket/resolve-ticket-dialog";
import { ViewReassignmentDialog } from "#/components/common/ticket/view-reassignment-dialog";
import { ViewResolutionDialog } from "#/components/common/ticket/view-resolution-dialog";
import { ViewTicketDialog } from "#/components/common/ticket/view-ticket-dialog";
import DataTable from "#/components/data-table";
import {
  getEscalationsPerTicket,
  getTicketReassignments,
  getTicketResolution,
} from "#/lib/actions/ticket";
import {
  isEscalationInitiatorRole,
  type ReassignmentInitiatorRole,
} from "#/lib/actions/ticket/types";

type OpenTicketDialog =
  | { kind: "view"; ticketId: string; escalations: ReturnType<typeof getEscalationsPerTicket> }
  | { kind: "viewResolution"; ticketId: string; resolution: ReturnType<typeof getTicketResolution> }
  | {
      kind: "viewReassignment";
      ticketId: string;
      reassignments: ReturnType<typeof getTicketReassignments>;
    }
  | { kind: "resolve" | "escalate" | "reassign"; ticketId: string };

export default function TicketsDatatable({
  tickets,
  role,
  hubId,
}: {
  tickets: TicketData[];
  role: ImplementerRole;
  hubId?: string;
}) {
  const [dialog, setDialog] = useState<OpenTicketDialog | null>(null);
  const ticket = dialog && tickets.find((t) => t.id === dialog.ticketId);
  const closeDialog = () => setDialog(null);

  const openDialog = (kind: TicketDialogKind, { id: ticketId }: TicketData) => {
    switch (kind) {
      case "view":
        return setDialog({ kind, ticketId, escalations: getEscalationsPerTicket(ticketId) });
      case "viewResolution":
        return setDialog({ kind, ticketId, resolution: getTicketResolution(ticketId) });
      case "viewReassignment":
        return setDialog({ kind, ticketId, reassignments: getTicketReassignments(ticketId) });
      default:
        return setDialog({ kind, ticketId });
    }
  };

  const renderTableActions = () => {
    if (!isEscalationInitiatorRole(role)) return null;
    return <CreateTicketDialog />;
  };

  return (
    <>
      <DataTable
        columns={columns({ openDialog, role })}
        data={tickets}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage="No tickets found"
        renderTableActions={renderTableActions()}
      />
      {ticket && dialog.kind === "view" && (
        <ViewTicketDialog
          ticket={ticket}
          escalations={dialog.escalations}
          onOpenChange={closeDialog}
        />
      )}
      {ticket && dialog.kind === "resolve" && (
        <ResolveTicketDialog ticket={ticket} open onOpenChange={closeDialog} />
      )}
      {ticket && dialog.kind === "viewResolution" && (
        <ViewResolutionDialog
          ticket={ticket}
          resolution={dialog.resolution}
          onOpenChange={closeDialog}
        />
      )}
      {ticket && dialog.kind === "escalate" && (
        <EscalateTicketDialog ticket={ticket} open onOpenChange={closeDialog} />
      )}
      {ticket && dialog.kind === "reassign" && (
        <ReassignTicketDialog
          ticket={ticket}
          hubId={hubId}
          role={role as ReassignmentInitiatorRole}
          open
          onOpenChange={closeDialog}
        />
      )}
      {ticket && dialog.kind === "viewReassignment" && (
        <ViewReassignmentDialog reassignments={dialog.reassignments} onOpenChange={closeDialog} />
      )}
    </>
  );
}
