import { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Dispatch, SetStateAction } from "react";

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
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setFellow(fellow);
            setEditDialog(true);
          }}
        >
          Edit fellow information
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setFellow(fellow);
            setViewComplaintsDialog(true);
          }}
        >
          View complaints
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setFellow(fellow);
            setWeeklyEvaluationDialog(true);
          }}
        >
          View weekly fellow evaluation
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setFellow(fellow);
            setUploadContractDialog(true);
          }}
        >
          <div className="flex w-full items-center justify-between space-x-2">
            Upload Contract
            <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setFellow(fellow);
            setUploadIdDialog(true);
          }}
        >
          <div className="flex w-full items-center justify-between space-x-2">
            Upload Identification document
            <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setFellow(fellow);
            setUploadQualificationDialog(true);
          }}
        >
          <div className="flex w-full items-center justify-between space-x-2">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
