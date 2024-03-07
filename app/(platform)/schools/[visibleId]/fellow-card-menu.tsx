"use client";

import { Fellow, Prisma } from "@prisma/client";
import React from "react";

import {
  FellowDropoutDialog,
  FellowUndropoutDialog,
} from "#/app/(platform)/schools/[visibleId]/dropout-dialog";
import { FellowModifyDialog } from "#/app/(platform)/schools/[visibleId]/fellow-modify-dialog";
import { FellowSubstitutionDialog } from "#/app/(platform)/schools/[visibleId]/fellow-substitution-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import Link from "next/link";

export default function FellowCardMenu({
  fellow,
  school,
  supervisor,
  fellowGroup,
  children,
}: {
  fellow: Fellow;
  supervisor: Prisma.SupervisorGetPayload<{}>;
  school: Prisma.SchoolGetPayload<{
    include: { hub: true; implementer: true };
  }>;
  fellowGroup?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 text-sm">
        <MenuLineItem>
          <FellowSubstitutionDialog
            fellow={fellow}
            close={() => setOpen(false)}
          >
            <div className="cursor-pointer">Substitute Fellow</div>
          </FellowSubstitutionDialog>
        </MenuLineItem>
        <DropdownMenuSeparator className="my-2" />
        <MenuLineItem>
          {/* // todo: make ?type=s0 (after this implementation) */}
          {fellowGroup ? (
            <Link href={`/schools/${school.visibleId}/${fellowGroup}?type=all`}>
              <div className="cursor-pointer">Group Evaluation</div>
            </Link>
          ) : (
            <p className="cursor-default">No Group Assigned</p>
          )}
        </MenuLineItem>
        <DropdownMenuSeparator className="my-2" />

        <MenuLineItem>
          <FellowModifyDialog
            mode="edit"
            fellow={fellow}
            info={{
              hubVisibleId: school?.hub?.visibleId!,
              supervisorVisibleId: supervisor.visibleId,
              implementerVisibleId: school?.implementer?.visibleId!,
              schoolVisibleIds: [school.visibleId],
            }}
          >
            <div className="cursor-pointer">Edit Information</div>
          </FellowModifyDialog>
        </MenuLineItem>
        <DropdownMenuSeparator className="my-2" />
        <MenuLineItem>
          {(!fellow.droppedOutAt || !fellow.droppedOut) && (
            <FellowDropoutDialog
              fellow={fellow}
              revalidationPath={`/schools/${school.visibleId}`}
            >
              <div className="cursor-pointer">Drop Out Fellow</div>
            </FellowDropoutDialog>
          )}
          {(fellow.droppedOutAt || fellow.droppedOut) && (
            <FellowUndropoutDialog
              fellow={fellow}
              revalidationPath={`/schools/${school.visibleId}`}
            >
              <div className="cursor-pointer">Undropout Fellow</div>
            </FellowUndropoutDialog>
          )}
        </MenuLineItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuLineItem({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-md p-1 hover:bg-zinc-100",
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      )}
    >
      {children}
    </div>
  );
}
