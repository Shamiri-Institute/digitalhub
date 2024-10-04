"use client";

import {
  columns,
  SchoolFellowTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/columns";
import { BatchUploadDownloadFellow } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/upload-csv";
import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
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
import { use, useContext } from "react";

export default function FellowsDatatable({
  fellows,
  supervisors,
}: {
  fellows: Promise<SchoolFellowTableData[]>;
  supervisors: Prisma.SupervisorGetPayload<{}>[];
}) {
  const renderTableActions = () => {
    return <BatchUploadDownloadFellow />;
  };

  const data = use(fellows);
  return (
    <DataTable
      columns={columns(supervisors)}
      data={data}
      className={"data-table data-table-action mt-4"}
      emptyStateMessage="No fellows associated with this school"
      renderTableActions={renderTableActions()}
    />
  );
}

export function FellowsDatatableMenu({
  fellow,
}: {
  fellow: SchoolFellowTableData;
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
        <DropdownMenuItem>View Fellow information</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            context.setAssignSupervisor(true);
          }}
        >
          Assign supervisor
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={context.fellow?.groupId === null}
          onClick={() => {
            context.setGroupDialog(true);
          }}
        >
          View students in group
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            context.setAttendanceHistoryDialog(true);
          }}
        >
          Session attendance history
        </DropdownMenuItem>
        <DropdownMenuItem>View student group evaluation</DropdownMenuItem>
        <DropdownMenuItem>View weekly fellow evaluation</DropdownMenuItem>
        <DropdownMenuItem>View complaints</DropdownMenuItem>
        <DropdownMenuItem>
          <div className="text-shamiri-red">Drop-out fellow</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
