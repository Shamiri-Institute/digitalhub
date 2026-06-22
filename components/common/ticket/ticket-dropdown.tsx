"use client";

import { ImplementerRole } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

import type { TicketData } from "./columns";

export function TicketDropdown({
  ticket,
  state,
}: {
  ticket: TicketData;
  state: {
    setTicket: Dispatch<SetStateAction<TicketData | undefined>>;
    setViewDialog: Dispatch<SetStateAction<boolean>>;
    setEditDialog: Dispatch<SetStateAction<boolean>>;
    setEscalateDialog: Dispatch<SetStateAction<boolean>>;
    role: ImplementerRole;
  };
}) {
  const isSupervisor = state.role === ImplementerRole.SUPERVISOR;

  return (
    <DropdownMenu>
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
        {isSupervisor && (
          <>
            <DropdownMenuItem
              onClick={() => {
                state.setTicket(ticket);
                state.setEditDialog(true);
              }}
            >
              Edit ticket
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                state.setTicket(ticket);
                state.setEscalateDialog(true);
              }}
            >
              Escalate ticket
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
