"use client";

import DataTable from "#/app/(platform)/hc/components/data-table";
import {
  columns,
  SchoolFellowTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/columns";
import { BatchUploadDownloadFellow } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/upload-csv";
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

export default function FellowsDatatable({
  fellows,
  supervisors,
}: {
  fellows: SchoolFellowTableData[];
  supervisors: Prisma.SupervisorGetPayload<{}>[];
}) {
  const renderTableActions = () => {
    // TODO: Move to main fellows page @Benny
    return <BatchUploadDownloadFellow />;
  };
  return (
    <DataTable
      columns={columns(supervisors)}
      data={fellows}
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
        <DropdownMenuItem>View Fellow information</DropdownMenuItem>
        <DropdownMenuItem>Assign supervisor</DropdownMenuItem>
        <DropdownMenuItem>View students in group</DropdownMenuItem>
        <DropdownMenuItem>Session attendance history</DropdownMenuItem>
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
