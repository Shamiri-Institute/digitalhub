"use client";

import {
  columns,
  SchoolFellowTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/columns";
import { BatchUploadDownloadFellow } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/upload-csv";
import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import StudentsInGroup from "#/components/common/student/students-in-group";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Prisma } from "@prisma/client";
import { Dispatch, SetStateAction, useContext, useState } from "react";

export default function FellowsDatatable({
  fellows,
  supervisors,
  schoolVisibleId,
}: {
  fellows: SchoolFellowTableData[];
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      fellows: true;
    };
  }>[];
  schoolVisibleId: string;
}) {
  const [fellow, setFellow] = useState<SchoolFellowTableData | undefined>();
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [replaceDialog, setReplaceDialog] = useState(false);
  const [studentsDialog, setStudentsDialog] = useState(false);
  const renderTableActions = () => {
    return <BatchUploadDownloadFellow />;
  };

  return (
    <>
      <DataTable
        columns={columns({
          setFellow,
          setDetailsDialog,
          setReplaceDialog,
          setStudentsDialog,
        })}
        data={fellows}
        className={"data-table data-table-action mt-4"}
        emptyStateMessage="No fellows associated with this school"
        renderTableActions={renderTableActions()}
      />
      {fellow && (
        <>
          <FellowDetailsForm
            open={detailsDialog}
            onOpenChange={setDetailsDialog}
            mode={"view"}
            fellow={fellow}
          />
          {fellow.groupId !== null ? (
            <>
              <ReplaceFellow
                open={replaceDialog}
                onOpenChange={setReplaceDialog}
                fellowId={fellow.id}
                groupId={fellow.groupId}
                supervisors={supervisors}
                schoolVisibleId={schoolVisibleId}
              >
                <DialogAlertWidget>
                  <div className="flex items-center gap-2">
                    <span>{fellow.fellowName}</span>
                    <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                      {""}
                    </span>
                    <span>{fellow.groupName}</span>
                  </div>
                </DialogAlertWidget>
              </ReplaceFellow>
              <StudentsInGroup
                students={fellow.students}
                groupId={fellow.groupId}
                groupName={fellow.groupName}
                schoolVisibleId={schoolVisibleId}
                open={studentsDialog}
                onOpenChange={setStudentsDialog}
              >
                <DialogAlertWidget>
                  <div className="flex items-center gap-2">
                    <span>Group {fellow.groupName}</span>
                  </div>
                </DialogAlertWidget>
              </StudentsInGroup>
            </>
          ) : null}
        </>
      )}
    </>
  );
}

export function FellowsDatatableMenu({
  fellow,
  state,
}: {
  fellow: SchoolFellowTableData;
  state: {
    setFellow: Dispatch<SetStateAction<SchoolFellowTableData | undefined>>;
    setDetailsDialog: Dispatch<SetStateAction<boolean>>;
    setReplaceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentsDialog: Dispatch<SetStateAction<boolean>>;
  };
}) {
  const context = useContext(FellowInfoContext);
  return (
    <DropdownMenu
      onOpenChange={() => {
        context.setFellow(fellow);
      }}
    >
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
          onClick={() => {
            state.setFellow(fellow);
            state.setDetailsDialog(true);
          }}
        >
          View fellow information
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={fellow.droppedOut ?? undefined}
          onClick={() => {
            context.setAssignSupervisor(true);
          }}
        >
          Assign supervisor
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={fellow.groupId === null}
          onClick={() => {
            state.setFellow(fellow);
            state.setStudentsDialog(true);
          }}
        >
          View students in group
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={fellow.groupId === null}
          onClick={() => {
            state.setFellow(fellow);
            state.setReplaceDialog(true);
          }}
        >
          Replace fellow
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            context.setAttendanceHistoryDialog(true);
          }}
        >
          Session attendance history
        </DropdownMenuItem>
        <DropdownMenuItem>View complaints</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
