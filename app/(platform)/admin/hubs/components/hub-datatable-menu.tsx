"use client";

import { Icons } from "#/components/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#/components/ui/dropdown-menu";
import { HubsWithSchools } from "./columns";
import { useState } from "react";
import HubCoordinatorProfileDialog from "./hub-coordinator-profile-dialog";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";

interface HubDatatableMenuProps {
  row: HubsWithSchools;
}

export default function HubDatatableMenu({ row }: HubDatatableMenuProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="absolute inset-0 border-l">
            <div className="flex h-full w-full items-center justify-center">
              <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
            </div>
          </div>  
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowProfile(true)}>
            View hub coordinator profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {row.coordinators[0] && (
        <HubCoordinatorProfileDialog
          open={showProfile}
          onOpenChange={setShowProfile}
          coordinator={row.coordinators[0]}
        >
          <DialogAlertWidget separator={false}>
            <div className="flex items-center gap-2">
              <span>{row.hubName}</span>
            </div>
          </DialogAlertWidget>
        </HubCoordinatorProfileDialog>
      )}
    </>
  );
} 