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
  console.log(
    `[FellowSchoolsDatatableDropdownMenu] RENDER - fellowId: ${fellowRow.id}, role: ${state.role}`,
  );

  function handleSetFellow(action: string) {
    console.log(
      `[FellowSchoolsDatatableDropdownMenu] ACTION: ${action} - Setting fellow:`,
      fellowRow.id,
      fellowRow.fellowName,
    );
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
              console.log("[FellowSchoolsDatatableDropdownMenu] CLICKED: Edit fellow information");
              handleSetFellow("Edit fellow information");
              state.setEditFellowDialog(true);
              console.log(
                "[FellowSchoolsDatatableDropdownMenu] STATE: editFellowDialog set to true",
              );
            }}
          >
            Edit fellow information
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => {
            console.log("[FellowSchoolsDatatableDropdownMenu] CLICKED: Session attendance history");
            handleSetFellow("Session attendance history");
            state.setAttendanceHistoryDialog(true);
            console.log(
              "[FellowSchoolsDatatableDropdownMenu] STATE: attendanceHistoryDialog set to true",
            );
          }}
        >
          Session attendance history
        </DropdownMenuItem>
        {state.role === "SUPERVISOR" ? (
          <>
            <DropdownMenuItem
              onClick={() => {
                console.log(
                  "[FellowSchoolsDatatableDropdownMenu] CLICKED: Submit weekly fellow evaluation",
                );
                handleSetFellow("Submit weekly fellow evaluation");
                state.setWeeklyEvaluationDialog(true);
                console.log(
                  "[FellowSchoolsDatatableDropdownMenu] STATE: weeklyEvaluationDialog set to true",
                );
              }}
            >
              Submit weekly fellow evaluation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                console.log("[FellowSchoolsDatatableDropdownMenu] CLICKED: Request repayment");
              }}
            >
              Request repayment
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                console.log("[FellowSchoolsDatatableDropdownMenu] CLICKED: Submit Complaint");
                handleSetFellow("Submit Complaint");
                state.setComplaintsDialog(true);
                console.log(
                  "[FellowSchoolsDatatableDropdownMenu] STATE: complaintsDialog set to true",
                );
              }}
            >
              Submit Complaint
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                console.log("[FellowSchoolsDatatableDropdownMenu] CLICKED: Upload Contract");
                handleSetFellow("Upload Contract");
                state.setUploadContractDialog(true);
                console.log(
                  "[FellowSchoolsDatatableDropdownMenu] STATE: uploadContractDialog set to true",
                );
              }}
            >
              <div className="flex w-full items-center justify-between space-x-2">
                Upload Contract
                <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                console.log(
                  "[FellowSchoolsDatatableDropdownMenu] CLICKED: Upload Identification document",
                );
                handleSetFellow("Upload Identification document");
                state.setUploadIdDialog(true);
                console.log(
                  "[FellowSchoolsDatatableDropdownMenu] STATE: uploadIdDialog set to true",
                );
              }}
            >
              <div className="flex w-full items-center justify-between space-x-2">
                Upload Identification document
                <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                console.log(
                  "[FellowSchoolsDatatableDropdownMenu] CLICKED: Upload qualification document",
                );
                handleSetFellow("Upload qualification document");
                state.setUploadQualificationDialog(true);
                console.log(
                  "[FellowSchoolsDatatableDropdownMenu] STATE: uploadQualificationDialog set to true",
                );
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
