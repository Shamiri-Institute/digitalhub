"use client";

import type { ImplementerRole } from "#/db/enums";
import { columns, hiddenTicketColumns } from "#/components/common/ticket/columns";
import CreateTicketDialog from "#/components/common/ticket/create-ticket-dialog";
import DataTable from "#/components/data-table";
import {
  type FullTicket,
  isEscalationInitiatorRole,
  type TicketAssignees,
} from "#/lib/actions/ticket/types";

export default function TicketsDatatable({
  tickets,
  role,
  assignees,
  basePath,
  viewerId,
  timeZone,
  emptyStateMessage,
}: {
  tickets: FullTicket[];
  role: ImplementerRole;
  assignees?: TicketAssignees;
  basePath: string;
  viewerId: string | null;
  timeZone: string | null;
  emptyStateMessage: string;
}) {
  return (
    <DataTable
      urlState
      columns={columns(basePath, viewerId, timeZone)}
      columnVisibilityState={hiddenTicketColumns}
      data={tickets}
      className="data-table data-table-action bg-white lg:mt-4"
      emptyStateMessage={emptyStateMessage}
      renderTableActions={
        isEscalationInitiatorRole(role) ? <CreateTicketDialog assignees={assignees} /> : undefined
      }
    />
  );
}
