"use client";

import type { ImplementerRole } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { getTicketEscalationStatus } from "#/lib/actions/ticket";
import {
  ESCALATION_RECIPIENT_ROLES,
  type TicketEscalationStatus,
} from "#/lib/actions/ticket/types";

import type { TicketData } from "./columns";

export function TicketDropdown({
  ticket,
  state,
}: {
  ticket: TicketData;
  state: {
    setTicket: Dispatch<SetStateAction<TicketData | undefined>>;
    setViewDialog: Dispatch<SetStateAction<boolean>>;
    setResolutionDialog: Dispatch<SetStateAction<boolean | "view">>;
    setEscalateDialog: Dispatch<SetStateAction<boolean>>;
    role: ImplementerRole;
  };
}) {
  const [status, setStatus] = useState<TicketEscalationStatus | null>(null);

  const fetchStatus = async () => {
    const result = await getTicketEscalationStatus(ticket.id);
    if (result.success && result.data) {
      setStatus(result.data);
    }
  };

  const isResolved = status?.isResolved ?? false;
  const showEscalate = status?.canEscalate ?? false;
  const isEscalationRecipient = ESCALATION_RECIPIENT_ROLES.includes(
    state.role as (typeof ESCALATION_RECIPIENT_ROLES)[number],
  );
  const showResolve = !isResolved && isEscalationRecipient && ticket.currentTier === state.role;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          void fetchStatus();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="text-shamiri-text-grey h-5 w-5" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-shamiri-text-grey text-xs font-medium uppercase">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            state.setTicket(ticket);
            state.setViewDialog(true);
          }}
        >
          View ticket
        </DropdownMenuItem>
        {(showResolve || isResolved) && (
          <DropdownMenuItem
            onClick={() => {
              state.setTicket(ticket);
              state.setResolutionDialog(showResolve ? true : "view");
            }}
          >
            {showResolve ? "Resolve ticket" : "View resolution"}
          </DropdownMenuItem>
        )}
        {showEscalate && (
          <DropdownMenuItem
            onClick={() => {
              state.setTicket(ticket);
              state.setEscalateDialog(true);
            }}
          >
            Escalate ticket
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
