import type { ImplementerRole } from "@prisma/client";
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
import type { FellowsData } from "../../../app/(platform)/sc/actions";

export default function FellowSchoolsDatatableDropdownMenu({
  fellowRow,
  state,
}: {
  fellowRow: FellowsData;
  state: {
    setWeeklyEvaluationDialog: Dispatch<SetStateAction<boolean>>;
    setEditFellowDialog: Dispatch<SetStateAction<boolean>>;
    setAttendanceHistoryDialog: Dispatch<SetStateAction<boolean>>;
    setUploadContractDialog: Dispatch<SetStateAction<boolean>>;
    setUploadIdDialog: Dispatch<SetStateAction<boolean>>;
    setUploadQualificationDialog: Dispatch<SetStateAction<boolean>>;
    setComplaintsDialog: Dispatch<SetStateAction<boolean>>;
    setFellow: Dispatch<SetStateAction<FellowsData | null>>;
    role: ImplementerRole;
  };
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
        {state.role === "SUPERVISOR" ? (
          <DropdownMenuItem
            onClick={() => {
              state.setFellow(fellowRow);
              state.setEditFellowDialog(true);
            }}
          >
            Edit fellow information
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => {
            state.setFellow(fellowRow);
            state.setAttendanceHistoryDialog(true);
          }}
        >
          Session attendance history
        </DropdownMenuItem>
        {state.role === "SUPERVISOR" ? (
          <>
            <DropdownMenuItem
              onClick={() => {
                state.setFellow(fellowRow);
                state.setWeeklyEvaluationDialog(true);
              }}
            >
              Submit weekly fellow evaluation
            </DropdownMenuItem>
            <DropdownMenuItem>Request repayment</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                state.setFellow(fellowRow);
                state.setComplaintsDialog(true);
              }}
            >
              Submit Complaint
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                state.setFellow(fellowRow);
                state.setUploadContractDialog(true);
              }}
            >
              <div className="flex w-full items-center justify-between space-x-2">
                Upload Contract
                <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                state.setFellow(fellowRow);
                state.setUploadIdDialog(true);
              }}
            >
              <div className="flex w-full items-center justify-between space-x-2">
                Upload Identification document
                <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                state.setFellow(fellowRow);
                state.setUploadQualificationDialog(true);
              }}
            >
              <div className="flex w-full items-center justify-between gap-x-6">
                Upload qualification document
                <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
              </div>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
