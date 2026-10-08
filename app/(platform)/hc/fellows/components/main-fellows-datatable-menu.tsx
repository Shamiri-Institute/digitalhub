import { ImplementerRole } from "#/db/enums";
import type { Dispatch, SetStateAction } from "react";
import type { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export default function MainFellowsDatatableMenu({
  fellow,
  setFellow,
  openEditDialog,
  openWeeklyEvaluationDialog,
  setViewComplaintsDialog,
  setDropOutDialog,
  role,
}: {
  fellow: MainFellowTableData;
  setFellow: Dispatch<SetStateAction<MainFellowTableData | null>>;
  openEditDialog: (fellow: MainFellowTableData) => void;
  openWeeklyEvaluationDialog: (fellow: MainFellowTableData) => void;
  setViewComplaintsDialog: Dispatch<SetStateAction<boolean>>;
  setDropOutDialog: Dispatch<SetStateAction<boolean>>;
  role: ImplementerRole;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l bg-white">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === ImplementerRole.ADMIN ? (
          <>
            <DropdownMenuItem onSelect={() => openEditDialog(fellow)}>
              View fellow information
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openWeeklyEvaluationDialog(fellow)}>
              View weekly fellow evaluation
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setViewComplaintsDialog(true);
              }}
              disabled={true}
            >
              View complaints
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={() => openEditDialog(fellow)}>
              Edit fellow information
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setViewComplaintsDialog(true);
              }}
            >
              Submit complaint
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openWeeklyEvaluationDialog(fellow)}>
              View weekly fellow evaluation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setFellow(fellow);
                setDropOutDialog(true);
              }}
            >
              {fellow.droppedOut ? (
                <div className="text-shamiri-red">Undo drop out</div>
              ) : (
                <div className="text-shamiri-red">Drop-out fellow</div>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
