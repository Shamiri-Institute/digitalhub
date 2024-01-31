"use client";

import { FellowDropoutDialog } from "#/app/(platform)/schools/[visibleId]/dropout-dialog";
import { FellowModifyDialog } from "#/app/(platform)/schools/[visibleId]/fellow-modify-dialog";
import { RescheduleDialog } from "#/app/(platform)/schools/[visibleId]/reschedule-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import { Fellow, Prisma } from "@prisma/client";

export default function FellowCardMenu({
  fellow,
  school,
  supervisor,
  children,
}: {
  fellow: Fellow;
  supervisor: Prisma.SupervisorGetPayload<{}>;
  school: Prisma.SchoolGetPayload<{
    include: { hub: true; implementer: true };
  }>;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 text-sm">
        <MenuLineItem>
          <RescheduleDialog fellow={fellow}>
            <div className="cursor-pointer">Substitute Fellow</div>
          </RescheduleDialog>
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
