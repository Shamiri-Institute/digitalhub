"use client";

import type { ImplementerRole } from "#/db/enums";
import { columns, hiddenTicketColumns } from "#/components/common/ticket/columns";
import CreateTicketDialog from "#/components/common/ticket/create-ticket-dialog";
import { roleLabel } from "#/components/common/ticket/format";
import DataTable from "#/components/data-table";
import {
  ESCALATION_RECIPIENT_FROM_INITIATOR,
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
  const noOneToTake = assignees && Object.values(assignees).every((people) => people.length === 0);
  const recipient = isEscalationInitiatorRole(role)
    ? ESCALATION_RECIPIENT_FROM_INITIATOR[role]()
    : undefined;
  return (
    <DataTable
      urlState
      columns={columns(basePath, viewerId, timeZone)}
      columnVisibilityState={hiddenTicketColumns}
      data={tickets}
      className="data-table data-table-action bg-white lg:mt-4"
      emptyStateMessage={emptyStateMessage}
      renderTableActions={
        isEscalationInitiatorRole(role) ? (
          <div className="flex items-center gap-2">
            {noOneToTake && recipient && (
              <span className="text-sm text-shamiri-text-dark-grey">
                {recipient === "ADMIN"
                  ? "No admin is available to take a ticket"
                  : `No ${roleLabel(recipient).toLowerCase()} in your hub`}
              </span>
            )}
            <CreateTicketDialog assignees={assignees} disabled={noOneToTake} />
          </div>
        ) : undefined
      }
    />
  );
}
