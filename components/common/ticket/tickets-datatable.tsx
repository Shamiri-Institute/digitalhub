"use client";

import type { ImplementerRole } from "@prisma/client";
import { useMemo, useState } from "react";
import { columns, type TicketData } from "#/components/common/ticket/columns";
import CreateTicketDialog from "#/components/common/ticket/create-ticket-dialog";
import { EscalateTicketDialog } from "#/components/common/ticket/escalate-ticket-dialog";
import { ResolveTicketDialog } from "#/components/common/ticket/resolve-ticket-dialog";
import { ViewResolutionDialog } from "#/components/common/ticket/view-resolution-dialog";
import { ViewTicketDialog } from "#/components/common/ticket/view-ticket-dialog";
import DataTable from "#/components/data-table";

export default function TicketsDatatable({
  tickets,
  role,
  showCreateButton = true,
}: {
  tickets: TicketData[];
  role: ImplementerRole;
  showCreateButton?: boolean;
}) {
  const [_ticket, _setTicket] = useState<TicketData | undefined>();
  const [viewDialog, setViewDialog] = useState(false);
  const [resolutionDialog, setResolutionDialog] = useState<boolean | "view">(false);
  const [escalateDialog, setEscalateDialog] = useState(false);

  const ticket = useMemo(() => {
    if (_ticket) {
      return tickets.find((t) => t.id === _ticket.id);
    }
    return _ticket;
  }, [tickets, _ticket]);

  const memoizedColumns = useMemo(() => {
    return columns({
      setTicket: _setTicket,
      setViewDialog,
      setResolutionDialog,
      setEscalateDialog,
      role,
    });
  }, [role]);

  const renderTableActions = () => {
    if (!showCreateButton) return null;
    return <CreateTicketDialog />;
  };

  return (
    <>
      <DataTable
        columns={memoizedColumns}
        data={tickets}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage="No tickets found"
        renderTableActions={renderTableActions()}
      />
      {ticket && (
        <ViewTicketDialog ticket={ticket} open={viewDialog} onOpenChange={setViewDialog} />
      )}
      {ticket && resolutionDialog === true && (
        <ResolveTicketDialog
          ticket={ticket}
          open={resolutionDialog === true}
          onOpenChange={() => setResolutionDialog(false)}
        />
      )}
      {ticket && resolutionDialog === "view" && (
        <ViewResolutionDialog
          ticket={ticket}
          open={resolutionDialog === "view"}
          onOpenChange={() => setResolutionDialog(false)}
        />
      )}
      {ticket && (
        <EscalateTicketDialog
          ticket={ticket}
          open={escalateDialog}
          onOpenChange={setEscalateDialog}
        />
      )}
    </>
  );
}
