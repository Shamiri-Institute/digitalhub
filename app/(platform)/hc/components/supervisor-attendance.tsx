import { SupervisorAttendanceContext } from "#/app/(platform)/hc/context/supervisor-attendance-dialog-context";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import { SessionDetail } from "#/components/common/session/session-list";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
} from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import {
  markManySupervisorAttendance,
  markSupervisorAttendance,
} from "#/lib/actions/supervisor";
import { cn, sessionDisplayName } from "#/lib/utils";
import { ImplementerRole, Prisma, SessionStatus } from "@prisma/client";
import { ColumnDef, Row } from "@tanstack/react-table";
import { ParseError, parsePhoneNumberWithError } from "libphonenumber-js";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

export default function SupervisorAttendance({
  supervisors,
  role,
}: {
  supervisors?: Prisma.SupervisorGetPayload<{
    include: {
      supervisorAttendances: {
        include: {
          session: true;
        };
      };
      fellows: {
        include: {
          fellowAttendances: true;
          groups: true;
        };
      };
      assignedSchools: true;
    };
  }>[];
  role: ImplementerRole;
}) {
  const context = useContext(SupervisorAttendanceContext);
  const [attendances, setAttendances] = useState<
    SupervisorAttendanceTableData[]
  >([]);

  useEffect(() => {
    const tableData =
      supervisors?.map((supervisor) => {
        const totalAttendedFellows = supervisor.fellows.filter((fellow) => {
          const attended = fellow.fellowAttendances.find(
            (attendance) => attendance.sessionId === context.session?.id,
          );
          if (attended) {
            return fellow;
          }
        });
        const attendance = supervisor.supervisorAttendances.find(
          (_attendance) => _attendance.sessionId === context.session?.id,
        );
        return {
          id: attendance?.id,
          supervisorId: supervisor.id,
          supervisorName: supervisor.supervisorName ?? "",
          pointSchools: supervisor.assignedSchools.map(
            (school) => school.schoolName,
          ),
          attendance: attendance?.attended,
          phoneNumber: supervisor.cellNumber ?? "",
          fellows:
            totalAttendedFellows.length + "/" + supervisor.fellows.length,
          sessionId: attendance?.sessionId,
          schoolId: attendance?.schoolId,
          absenceReason: attendance?.absenceReason ?? "",
          absenceComments: attendance?.absenceComments ?? "",
          schoolName:
            context.session?.school?.schoolName ??
            context.session?.venue ??
            undefined,
          sessionType: context.session?.sessionType ?? undefined,
          sessionStatus: context.session?.status,
        };
      }) ?? [];
    setAttendances(tableData);
  }, [context.isOpen, context.session, supervisors]);

  return (
    <div>
      <Dialog
        open={context.isOpen}
        onOpenChange={context.setIsOpen}
        modal={true}
      >
        <DialogPortal>
          <DialogContent className="w-5/6 max-w-none lg:w-4/5">
            <DialogHeader>
              <span className="text-xl font-bold">
                Mark supervisor attendance
              </span>
            </DialogHeader>
            {context.session && (
              <SessionDetail
                state={{ session: context.session }}
                layout={"compact"}
                withDropdown={false}
                role={role}
              />
            )}
            <SupervisorAttendanceDataTable
              data={attendances}
              toggleBulkMode={true}
            />
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}

export function SupervisorAttendanceDataTable({
  data,
  emptyStateMessage = "No supervisors in hub",
  overrideColumns,
  toggleBulkMode = false,
}: {
  data: SupervisorAttendanceTableData[];
  emptyStateMessage?: string;
  overrideColumns?: (state: {
    setAttendance: Dispatch<
      SetStateAction<SupervisorAttendanceTableData | undefined>
    >;
  }) => ColumnDef<SupervisorAttendanceTableData>[];
  toggleBulkMode?: boolean;
}) {
  const [selectedRows, setSelectedRows] = useState<
    Row<SupervisorAttendanceTableData>[]
  >([]);
  const [bulkMode, setBulkMode] = useState<boolean>(false);
  const [attendance, setAttendance] = useState<
    SupervisorAttendanceTableData | undefined
  >();

  const context = useContext(SupervisorAttendanceContext);

  const renderTableActions = () => {
    return (
      toggleBulkMode && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex gap-1"
            disabled={selectedRows.length === 0}
            onClick={() => {
              setBulkMode(true);
              context.setMarkAttendanceDialog(true);
            }}
          >
            <Icons.fileDown className="h-4 w-4 text-shamiri-text-grey" />
            <span>Mark supervisor attendance</span>
          </Button>
        </div>
      )
    );
  };

  return (
    <div className="space-y-4 pt-2">
      {/* TODO: https://github.com/TanStack/table/issues/4382 --> ColumnDef types gives typescript error */}
      <DataTable
        columns={
          overrideColumns
            ? overrideColumns({
                setAttendance,
              })
            : (columns({
                setAttendance,
              }) as ColumnDef<SupervisorAttendanceTableData>[])
        }
        data={data}
        editColumns={false}
        className={"data-table data-table-action lg:mt-4"}
        emptyStateMessage={emptyStateMessage}
        onRowSelectionChange={setSelectedRows}
        enableRowSelection={(row: Row<SupervisorAttendanceTableData>) =>
          row.original.sessionStatus !== SessionStatus.Cancelled
        }
        renderTableActions={renderTableActions()}
      />
      <MarkAttendance
        title={"Mark supervisor attendance"}
        selectedSessionId={attendance?.sessionId ?? context.session?.id}
        attendances={
          attendance
            ? [
                {
                  attendanceId: attendance.id!,
                  id: attendance.supervisorId,
                  attended: attendance.attendance ?? null,
                  absenceReason: attendance.absenceReason ?? null,
                  sessionId: attendance.sessionId!,
                  schoolId: attendance.schoolId ?? null,
                  comments: attendance.absenceComments,
                },
              ]
            : []
        }
        id={attendance?.supervisorId}
        isOpen={context.markAttendanceDialog}
        setIsOpen={context.setMarkAttendanceDialog}
        markAttendanceAction={markSupervisorAttendance}
        sessionMode="single"
        bulkMode={bulkMode}
        setBulkMode={setBulkMode}
        markBulkAttendanceAction={markManySupervisorAttendance}
        selectedIds={selectedRows.map((x): string => x.original.supervisorId)}
      >
        <DialogAlertWidget>
          <div className="flex items-center gap-2">
            {bulkMode ? (
              <span>{selectedRows.length} supervisors</span>
            ) : (
              <span>{attendance?.supervisorName}</span>
            )}
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
              {""}
            </span>
            <span>
              {sessionDisplayName(
                attendance?.sessionType ?? context.session?.sessionType ?? "",
              )}
            </span>
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
              {""}
            </span>
            <span>
              {attendance?.schoolName ??
                context.session?.school?.schoolName ??
                context.session?.venue}
            </span>
          </div>
        </DialogAlertWidget>
      </MarkAttendance>
    </div>
  );
}

export type SupervisorAttendanceTableData = {
  id: string | undefined;
  supervisorId: string;
  supervisorName: string;
  pointSchools?: string[];
  attendance?: boolean | null;
  phoneNumber: string;
  fellows: string;
  schoolName?: string;
  schoolId?: string | null;
  sessionType?: string;
  sessionId?: string;
  occurred?: boolean | null;
  sessionStatus?: SessionStatus | null;
  sessionDate?: Date;
  absenceReason?: string;
  absenceComments?: string;
};

const columns = (state: {
  setAttendance: Dispatch<
    SetStateAction<SupervisorAttendanceTableData | undefined>
  >;
}): ColumnDef<SupervisorAttendanceTableData>[] => [
  {
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
        aria-label="Select all"
        className={
          "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
        }
      />
    ),
    cell: ({ row }) => {
      const sessionOccurredStatus =
        row.original.sessionStatus === SessionStatus.Cancelled;
      return (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            disabled={sessionOccurredStatus}
            aria-label="Select row"
            className={
              "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
            }
          />
        </div>
      );
    },
    id: "checkbox",
    accessorKey: "id",
  },
  {
    id: "name",
    accessorKey: "supervisorName",
    header: "Name",
  },
  {
    cell: (props) => {
      const attended = props.getValue();
      return (
        <div className="flex">
          <div
            className={cn(
              "flex items-center rounded-[0.25rem] border px-1.5 py-0.5",
              {
                "border-green-border": attended,
                "border-red-border": !attended,
                "border-blue-border":
                  attended === undefined || attended === null,
              },
              {
                "bg-green-bg": attended,
                "bg-red-bg": !attended,
                "bg-blue-bg": attended === undefined || attended === null,
              },
            )}
          >
            {attended === null || attended === undefined ? (
              <div className="flex items-center gap-1 text-blue-base">
                <Icons.helpCircle className="h-3 w-3" strokeWidth={2.5} />
                <span>Not marked</span>
              </div>
            ) : attended ? (
              <div className="flex items-center gap-1 text-green-base">
                <Icons.checkCircle className="h-3 w-3" strokeWidth={2.5} />
                <span>Attended</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-base">
                <Icons.crossCircleFilled
                  className="h-3 w-3"
                  strokeWidth={2.5}
                />
                <span>Missed</span>
              </div>
            )}
          </div>
        </div>
      );
    },
    header: "Attendance",
    id: "attendance",
    accessorKey: "attendance",
  },
  {
    cell: ({ row }) => {
      const schools = row.original.pointSchools;
      if (!schools) {
        return null;
      }
      if (schools.length > 1) {
        return (
          <div className="relative flex items-center">
            <span>{schools[0]},</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="ml-2 cursor-pointer select-none text-shamiri-new-blue">
                  +{schools?.length - 1}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent>
                  <div className="flex flex-col gap-y-2 px-2 py-1 text-sm">
                    {schools.slice(1).map((school, index) => {
                      return <span key={index.toString()}>{school}</span>;
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </div>
        );
      }
      return <span>{schools[0]}</span>;
    },
    header: "Point Schools",
    id: "pointSchools",
    accessorKey: "pointSchools",
  },
  {
    cell: ({ row }) => {
      try {
        return (
          row.original.phoneNumber &&
          parsePhoneNumberWithError(
            row.original.phoneNumber,
            "KE",
          ).formatNational()
        );
      } catch (error) {
        if (error instanceof ParseError) {
          // Not a phone number, non-existent country, etc.
          return (
            row.original.phoneNumber && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex gap-1">
                    <Icons.flagTriangleRight className="h-4 w-4 text-shamiri-red" />
                    <span>{row.original.phoneNumber}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="px-2 py-1 capitalize">
                    {error.message.toLowerCase().replace("_", " ")}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          );
        } else {
          throw error;
        }
      }
    },
    header: "Phone number",
    id: "phoneNumber",
    accessorKey: "phoneNumber",
  },
  {
    accessorKey: "fellows",
    header: "No. of fellows",
    id: "fellows",
  },
  {
    cell: (props) => {
      return (
        <SupervisorAttendanceDataTableMenu
          attendance={props.row.original}
          state={state}
        />
      );
    },
    id: "button",
    header: undefined,
    accessorKey: "attendance",
  },
];

export function SupervisorAttendanceDataTableMenu({
  attendance,
  state,
}: {
  attendance: SupervisorAttendanceTableData | undefined;
  state: {
    setAttendance: Dispatch<
      SetStateAction<SupervisorAttendanceTableData | undefined>
    >;
  };
}) {
  const context = useContext(SupervisorAttendanceContext);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l bg-white">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <span className="text-xs font-medium uppercase text-shamiri-text-grey">
              Actions
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              state.setAttendance(attendance);
              context.setMarkAttendanceDialog(true);
            }}
            disabled={attendance?.sessionStatus === SessionStatus.Cancelled}
          >
            Mark attendance
          </DropdownMenuItem>
          {/*TODO: Refactor Session attendance history component*/}
          {/*<DropdownMenuItem*/}
          {/*  disabled={attendance?.sessionStatus === SessionStatus.Cancelled}*/}
          {/*>*/}
          {/*  Supervisor attendance history*/}
          {/*</DropdownMenuItem>*/}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
