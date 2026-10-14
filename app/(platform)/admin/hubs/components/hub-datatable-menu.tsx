"use client";

import { useState } from "react";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import type { HubsWithSchools } from "./columns";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { fetchHubSessionNames, type HubSessionName } from "#/lib/actions/admin/hubs";
import HubCoordinatorProfileDialog from "./hub-coordinator-profile-dialog";
import HubDialog from "./hub-dialog";

interface HubDatatableMenuProps {
  row: HubsWithSchools;
  canManageHubs: boolean;
}

export default function HubDatatableMenu({ row, canManageHubs }: HubDatatableMenuProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [sessionNames, setSessionNames] = useState<HubSessionName[]>([]);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const firstCoordinator = row.coordinators.toSorted(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )[0];

  const openEdit = async () => {
    // A second click while the first load runs would race it and open the form on stale rows.
    if (isLoadingEdit) return;
    setIsLoadingEdit(true);
    try {
      const response = await fetchHubSessionNames(row.id);
      if (!response.success || !response.data) {
        toast({ variant: "destructive", description: response.message });
        return;
      }
      setSessionNames(response.data);
      setShowEdit(true);
    } finally {
      setIsLoadingEdit(false);
    }
  };

  // A new hub has no coordinator yet, and only a super admin may edit, so a row can have no actions.
  if (!firstCoordinator && !canManageHubs) {
    return null;
  }

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
          {firstCoordinator && (
            <DropdownMenuItem onClick={() => setShowProfile(true)}>
              View hub coordinator profile
            </DropdownMenuItem>
          )}
          {canManageHubs && (
            <DropdownMenuItem onClick={toastOnError(openEdit)}>Edit hub details</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {firstCoordinator && (
        <HubCoordinatorProfileDialog
          open={showProfile}
          onOpenChange={setShowProfile}
          coordinator={firstCoordinator}
        >
          <DialogAlertWidget separator={false}>
            <div className="flex items-center gap-2">
              <span>{row.hubName}</span>
            </div>
          </DialogAlertWidget>
        </HubCoordinatorProfileDialog>
      )}
      {canManageHubs && (
        <HubDialog open={showEdit} onOpenChange={setShowEdit} edit={{ hub: row, sessionNames }} />
      )}
    </>
  );
}
