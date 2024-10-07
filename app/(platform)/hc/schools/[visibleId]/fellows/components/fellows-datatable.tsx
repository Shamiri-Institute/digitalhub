"use client";

import {
  columns,
  SchoolFellowTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/columns";
import { BatchUploadDownloadFellow } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/upload-csv";
import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
import WeeklyFellowEvaluation from "#/components/common/fellow/weekly-fellow-evaluation";
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
import { Dispatch, SetStateAction, use, useContext, useState } from "react";

export default function FellowsDatatable({
  fellows,
  supervisors,
  weeklyEvaluations,
  project,
}: {
  fellows: Promise<SchoolFellowTableData[]>;
  supervisors: Prisma.SupervisorGetPayload<{}>[];
  weeklyEvaluations: Prisma.WeeklyFellowRatingsGetPayload<{}>[];
  project?: Prisma.ProjectGetPayload<{}>;
}) {
  const [weeklyEvaluationDialog, setWeeklyEvaluationDialog] = useState(false);
  const [fellow, setFellow] = useState<SchoolFellowTableData | undefined>();

  const renderTableActions = () => {
    return <BatchUploadDownloadFellow />;
  };

  const data = use(fellows);
  return (
    <div>
      <DataTable
        columns={columns({ setFellow, setWeeklyEvaluationDialog })}
        data={data}
        className={"data-table data-table-action mt-4"}
        emptyStateMessage="No fellows associated with this school"
        renderTableActions={renderTableActions()}
      />
      {fellow && (
        <WeeklyFellowEvaluation
          fellow={fellow}
          open={weeklyEvaluationDialog}
          onOpenChange={setWeeklyEvaluationDialog}
          evaluations={weeklyEvaluations.filter(
            (evaluation) => evaluation.fellowId === fellow.id,
          )}
          project={project}
        />
      )}
    </div>
  );
}

export function FellowsDatatableMenu({
  fellow,
  state,
}: {
  fellow: SchoolFellowTableData;
  state: {
    setFellow: Dispatch<SetStateAction<SchoolFellowTableData | undefined>>;
    setWeeklyEvaluationDialog: Dispatch<SetStateAction<boolean>>;
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
        <DropdownMenuItem
          onClick={() => {
            state.setFellow(fellow);
            state.setWeeklyEvaluationDialog(true);
          }}
        >
          View weekly fellow evaluation
        </DropdownMenuItem>
        <DropdownMenuItem>View complaints</DropdownMenuItem>
        <DropdownMenuItem>
          <div className="text-shamiri-red">Drop-out fellow</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
