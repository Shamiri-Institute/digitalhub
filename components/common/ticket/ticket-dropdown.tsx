"use client";

import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { toast } from "#/components/ui/use-toast";
import { getTicketEscalationStatus, startTicket } from "#/lib/actions/ticket";
import type { TicketEscalationStatus } from "#/lib/actions/ticket/types";

import type { TicketData, TicketTableState } from "./columns";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

export function TicketDropdown({ ticket, state }: { ticket: TicketData; state: TicketTableState }) {
  const [status, setStatus] = useState<TicketEscalationStatus | null>(null);

  const fetchStatus = async () => {
    const result = await getTicketEscalationStatus(ticket.id);
    if (result.success && result.data) {
      setStatus(result.data);
    }
  };

  const canResolve = status?.canResolve ?? false;
  const showEscalate = status?.canEscalate ?? false;
  const showReassign = status?.canReassign ?? false;
  const hasReassignment = status?.hasReassignment ?? false;
  const hasResolution = status?.hasResolution ?? false;

  const [isStarting, startTransition] = useTransition();
  const start = () =>
    startTransition(async () => {
      const result = await startTicket(ticket.id);
      toast({ variant: result.success ? "default" : "destructive", description: result.message });
    });
  const showResolve = canResolve && ticket.currentTier === state.role;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          void fetchStatus();
        }
      }}
    >
      <RowActionsTrigger label={`Actions for ${ticket.subject}`} />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-shamiri-text-grey text-xs font-medium uppercase">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => state.openDialog("view", ticket)}>
          View ticket
        </DropdownMenuItem>
        {status?.canStart && (
          <DropdownMenuItem disabled={isStarting} onClick={start}>
            Start ticket
          </DropdownMenuItem>
        )}
        {status?.canChangePriority && (
          <DropdownMenuItem onClick={() => state.openDialog("changePriority", ticket)}>
            Change priority
          </DropdownMenuItem>
        )}
        {(showResolve || hasResolution) && (
          <DropdownMenuItem
            onClick={() => state.openDialog(showResolve ? "resolve" : "viewResolution", ticket)}
          >
            {showResolve ? "Resolve ticket" : "View resolution"}
          </DropdownMenuItem>
        )}
        {showReassign && (
          <DropdownMenuItem onClick={() => state.openDialog("reassign", ticket)}>
            Reassign ticket
          </DropdownMenuItem>
        )}
        {hasReassignment && (
          <DropdownMenuItem onClick={() => state.openDialog("viewReassignment", ticket)}>
            View reassignment
          </DropdownMenuItem>
        )}
        {showEscalate && (
          <DropdownMenuItem onClick={() => state.openDialog("escalate", ticket)}>
            Escalate ticket
          </DropdownMenuItem>
        )}
        {status?.canReopen && (
          <DropdownMenuItem onClick={() => state.openDialog("reopen", ticket)}>
            Reopen ticket
          </DropdownMenuItem>
        )}
        {status?.canCancel && (
          <DropdownMenuItem onClick={() => state.openDialog("cancel", ticket)}>
            Cancel ticket
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
