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
import { ImplementerRole } from "@prisma/client";

export default function MainFellowsDatatableMenu({
  fellow,
  setFellow,
  setEditDialog,
  setUploadContractDialog,
  setUploadIdDialog,
  setUploadQualificationDialog,
  setWeeklyEvaluationDialog,
  setViewComplaintsDialog,
  setDropOutDialog,
  role,
}: {
  fellow: MainFellowTableData;
  setFellow: Dispatch<SetStateAction<MainFellowTableData | null>>;
  setEditDialog: Dispatch<SetStateAction<boolean>>;
  setUploadContractDialog: Dispatch<SetStateAction<boolean>>;
  setUploadIdDialog: Dispatch<SetStateAction<boolean>>;
  setUploadQualificationDialog: Dispatch<SetStateAction<boolean>>;
  setWeeklyEvaluationDialog: Dispatch<SetStateAction<boolean>>;
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
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setEditDialog(true);
              }}
            >
              View fellow information
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setWeeklyEvaluationDialog(true);
              }}
            >
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
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setUploadContractDialog(true);
              }}
              disabled={true}
            >
              View contract
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setUploadIdDialog(true);
              }}
              disabled={true}
            >
              View identification document
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setUploadQualificationDialog(true);
              }}
              disabled={true}
            >
              View qualification document
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setEditDialog(true);
              }}
            >
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
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setWeeklyEvaluationDialog(true);
              }}
            >
              View weekly fellow evaluation
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setUploadContractDialog(true);
              }}
            >
              <div className="flex w-full items-center justify-between gap-x-2">
                Upload Contract
                <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setUploadIdDialog(true);
              }}
            >
              <div className="flex w-full items-center justify-between gap-x-2">
                Upload Identification document
                <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setFellow(fellow);
                setUploadQualificationDialog(true);
              }}
            >
              <div className="flex w-full items-center justify-between gap-x-2">
                Upload qualification document
                <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
              </div>
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
