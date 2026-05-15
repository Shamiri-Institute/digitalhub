import type { ImplementerRole } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import { memo } from "react";
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

const FellowSchoolsDatatableDropdownMenu = memo(function FellowSchoolsDatatableDropdownMenu({
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
  function handleSetFellow() {
    state.setFellow(fellowRow);
  }

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
              handleSetFellow();
              state.setEditFellowDialog(true);
            }}
          >
            Edit fellow information
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
            onClick={() => {
              handleSetFellow();
              state.setAttendanceHistoryDialog(true);
            }}
        >
          Session attendance history
        </DropdownMenuItem>
        {state.role === "SUPERVISOR" ? (
          <>
            <DropdownMenuItem
                onClick={() => {
                  handleSetFellow();
                  state.setWeeklyEvaluationDialog(true);
                }}
            >
              Submit weekly fellow evaluation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                handleSetFellow();
              }}
            >
              Request repayment
            </DropdownMenuItem>
            <DropdownMenuItem
                onClick={() => {
                  handleSetFellow();
                  state.setComplaintsDialog(true);
                }}
            >
              Submit Complaint
            </DropdownMenuItem>
            <DropdownMenuItem
                onClick={() => {
                  handleSetFellow();
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
                  handleSetFellow();
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
                  handleSetFellow();
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
});

export default FellowSchoolsDatatableDropdownMenu;
