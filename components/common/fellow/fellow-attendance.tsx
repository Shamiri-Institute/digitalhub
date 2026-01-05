import { ImplementerRole, type Prisma, type SessionStatus } from "@prisma/client";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { CheckCheck, InfoIcon } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import AttendanceStatusWidget from "#/components/common/attendance-status-widget";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import FellowAttendanceMenu from "#/components/common/fellow/fellow-attendance-menu";
import { MarkAttendance } from "#/components/common/mark-attendance";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import { SessionDetail } from "#/components/common/session/session-list";
import type { Session } from "#/components/common/session/sessions-provider";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { markFellowAttendance, markManyFellowAttendance } from "#/lib/actions/fellow";
import { sessionDisplayName } from "#/lib/utils";

type SupervisorData = Prisma.SupervisorGetPayload<{
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
}>;

export default function FellowAttendance({
  supervisors,
  supervisorId,
  session,
  fellowRatings,
  role,
  isOpen,
  setIsOpen,
}: {
  supervisors?: SupervisorData[];
  supervisorId?: string;
  session: Session | null;
  fellowRatings: {
    id: string;
    averageRating: number;
  }[];
  role: ImplementerRole;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>();
  const [fellows, setFellows] = useState<FellowAttendancesTableData[]>([]);

  const form = useForm<{ supervisor: string }>({
    defaultValues: {
      supervisor: supervisorId,
    },
  });
  const watcher = form.watch("supervisor");

  useEffect(() => {
    const supervisor = supervisors?.find((supervisor) => supervisor.id === watcher);
    if (supervisor) {
      const attendances = supervisor.fellows.map((fellow) => {
        const sessionAttendance = fellow.fellowAttendances.find(
          (attendance) => attendance.sessionId === session?.id,
        );

        const group = fellow.groups.find((group) => group.schoolId === session?.schoolId);
        return {
          id: sessionAttendance?.id.toString(),
          processedAt: sessionAttendance?.processedAt ?? null,
          sessionId: session?.id,
          fellowId: fellow.id,
          fellowName: fellow.fellowName,
          cellNumber: fellow.cellNumber,
          attended: sessionAttendance?.attended ?? null,
          supervisorName: supervisor.supervisorName,
          supervisorId: supervisor.id,
          schoolName: session?.school?.schoolName ?? session?.venue,
          schoolId: sessionAttendance?.schoolId,
          groupName: group?.groupName ?? null,
          groupType: group?.groupType,
          groupId: group?.id,
          averageRating:
            fellowRatings.find((rating) => rating.id === fellow.id)?.averageRating ?? null,
          sessionType: session?.session?.sessionType,
          sessionName: session?.session?.sessionName,
          occurred: session?.occurred,
          sessionStatus: session?.status,
          sessionDate: session?.sessionDate,
          droppedOut: fellow.droppedOut ?? undefined,
        };
      });
      setFellows(attendances);
    }
  }, [fellowRatings, selectedSupervisor, session, supervisors, watcher]);

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen} modal={true}>
        <DialogPortal>
          <DialogContent className="w-3/4 max-w-none">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.ADMIN
                  ? "View fellow attendance"
                  : role === ImplementerRole.SUPERVISOR
                    ? "Mark fellow attendance"
                    : null}
              </DialogTitle>
            </DialogHeader>
            {session && (
              <SessionDetail
                state={{ session }}
                layout={"compact"}
                withDropdown={false}
                role={role}
              />
            )}

            <div className="mb-4">
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="supervisor"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className={"text-sm"}>Select a supervisor</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedSupervisor(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a supervisor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {supervisors?.map((supervisor) => (
                            <SelectItem key={supervisor.id} value={supervisor.id}>
                              {supervisor.supervisorName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>
            </div>

            <div className="space-y-4">
              {/* TODO: https://github.com/TanStack/table/issues/4382 --> ColumnDef types gives typescript error */}
              <FellowAttendanceDataTable
                data={fellows}
                emptyStateMessage={watcher === undefined ? "Please select a supervisor" : undefined}
                enableRowSelection={(row: Row<FellowAttendancesTableData>) =>
                  !(
                    row.original.sessionType === "INTERVENTION" &&
                    row.original.groupId === undefined
                  ) &&
                  (row.original.sessionType !== "INTERVENTION" ||
                    row.original.groupType === "TREATMENT") &&
                  (row.original.supervisorId === supervisorId || role === "HUB_COORDINATOR") &&
                  !row.original.droppedOut &&
                  row.original.processedAt === null
                }
                session={session}
                role={role}
                editColumns={true}
              />
              <div className="flex justify-end gap-6">
                <Button
                  className="bg-shamiri-new-blue"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}

export function FellowAttendanceDataTable({
  data,
  editColumns = false,
  closeDialogFn,
  emptyStateMessage = "No fellows assigned to this supervisor",
  enableRowSelection,
  session,
  overrideColumns,
  role,
}: {
  data: FellowAttendancesTableData[];
  editColumns?: boolean;
  onChangeData?: Dispatch<SetStateAction<FellowAttendancesTableData[]>>;
  closeDialogFn?: Dispatch<SetStateAction<boolean>>;
  emptyStateMessage?: string;
  session?: Prisma.InterventionSessionGetPayload<{
    include: { school: true; sessionRatings: true; session: true };
  }> | null;
  enableRowSelection?: boolean | ((row: Row<FellowAttendancesTableData>) => boolean) | undefined;
  overrideColumns?: (state: {
    setAttendance: Dispatch<SetStateAction<FellowAttendancesTableData | undefined>>;
    setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  }) => ColumnDef<FellowAttendancesTableData>[];
  role: ImplementerRole;
}) {
  const [selectedRows, setSelectedRows] = useState<Row<FellowAttendancesTableData>[]>([]);
  const [attendance, setAttendance] = useState<FellowAttendancesTableData | undefined>();
  const [bulkMode, setBulkMode] = useState<boolean>(false);
  const [attendanceDialog, setAttendanceDialog] = useState<boolean>(false);

  const renderTableActions = () => {
    return (
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex gap-1"
          disabled={selectedRows.length === 0}
          onClick={() => {
            setBulkMode(true);
            setAttendanceDialog(true);
          }}
        >
          <Icons.fileDown className="h-4 w-4 text-shamiri-text-grey" />
          <span>Mark fellow attendance</span>
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <DataTable
        columns={
          overrideColumns
            ? overrideColumns({
                setAttendance,
                setAttendanceDialog,
              })
            : columns({
                setAttendance,
                setAttendanceDialog,
              })
        }
        data={data}
        editColumns={editColumns}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage={emptyStateMessage}
        rowSelectionDescription="fellows"
        enableRowSelection={enableRowSelection}
        onRowSelectionChange={setSelectedRows}
        renderTableActions={
          !overrideColumns && role === ImplementerRole.HUB_COORDINATOR && renderTableActions()
        }
        columnVisibilityState={{
          checkbox: role === ImplementerRole.ADMIN ? false : true,
          button: role === ImplementerRole.ADMIN ? false : true,
          "Group Type": false,
        }}
      />
      <MarkAttendance
        title={"Mark fellow attendance"}
        selectedSessionId={attendance?.sessionId ?? session?.id}
        attendances={
          attendance
            ? [
                {
                  attendanceId: attendance.id!,
                  id: attendance.fellowId,
                  attended: attendance.attended ?? null,
                  absenceReason: attendance.absenceReason ?? null,
                  sessionId: attendance.sessionId!,
                  schoolId: attendance.schoolId ?? null,
                  comments: attendance.absenceComments,
                },
              ]
            : []
        }
        id={attendance?.fellowId}
        isOpen={attendanceDialog}
        setIsOpen={setAttendanceDialog}
        markAttendanceAction={markFellowAttendance}
        sessionMode="single"
        bulkMode={bulkMode}
        setBulkMode={setBulkMode}
        markBulkAttendanceAction={markManyFellowAttendance}
        selectedIds={selectedRows.map((x): string => x.original.fellowId)}
      >
        <div className="flex flex-col gap-y-3">
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              {bulkMode ? (
                <span>{selectedRows.length} fellows</span>
              ) : (
                <span>{attendance?.fellowName}</span>
              )}
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
              <span>
                {sessionDisplayName(attendance?.sessionName ?? session?.session?.sessionName ?? "")}
              </span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
              <span>{attendance?.schoolName ?? session?.school?.schoolName ?? session?.venue}</span>
            </div>
          </DialogAlertWidget>
          <Alert variant="destructive">
            <AlertTitle className="flex gap-2">
              <InfoIcon className="mt-1 h-4 w-4 shrink-0" />
              <span className="text-base">
                Please confirm {bulkMode ? "fellows' M-Pesa numbers" : "fellow's M-Pesa number"}{" "}
                before marking attendance.
              </span>
            </AlertTitle>
          </Alert>
          <Separator />
        </div>
      </MarkAttendance>
      {closeDialogFn && (
        <Button
          type="button"
          className="border-0 bg-shamiri-new-blue text-white hover:bg-shamiri-new-blue/80"
          onClick={() => {
            closeDialogFn(false);
          }}
        >
          Done
        </Button>
      )}
    </div>
  );
}

export type FellowAttendancesTableData = {
  id?: string;
  sessionId?: string;
  fellowId: string;
  fellowName: string | null;
  cellNumber: string | null;
  attended: boolean | null;
  supervisorName?: string | null;
  supervisorId: string | null;
  schoolName?: string | null;
  schoolId?: string | null;
  groupName: string | null;
  groupId?: string;
  groupType?: string;
  averageRating: number | null;
  sessionType?: string;
  sessionName?: string;
  occurred?: boolean | null;
  sessionStatus?: SessionStatus | null;
  sessionDate?: Date;
  droppedOut?: boolean;
  absenceReason?: string;
  absenceComments?: string;
  processedAt: Date | null;
};

export const columns = (state: {
  setAttendance: Dispatch<SetStateAction<FellowAttendancesTableData | undefined>>;
  setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
}): ColumnDef<FellowAttendancesTableData>[] => [
  {
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
        aria-label="Select all"
        className={
          "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
        }
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
            className={
              "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
            }
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "Name",
    accessorKey: "fellowName",
    header: "Name",
  },
  {
    cell: ({ row }) => {
      const attended = row.original.attended;
      return (
        <div className="flex flex-row gap-1">
          <AttendanceStatusWidget attended={attended} />
          {row.original.processedAt && (
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center rounded-lg border border-green-border bg-green-bg px-1.5 py-1.5">
                  <div className="flex items-center gap-1 text-green-base">
                    <CheckCheck className="h-3 w-3" strokeWidth={2.5} />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="border bg-background-secondary text-foreground drop-shadow-sm">
                <div className="px-2 py-1 text-sm">
                  Processed on {format(row.original.processedAt, "dd-MM-yyyy HH:mm a")}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      );
    },
    header: "Attendance",
    id: "Attendance",
    accessorKey: "attended",
  },
  {
    accessorKey: "averageRating",
    cell: ({ row }) => {
      const rating = row.original.averageRating ?? 0;
      const remainder = rating - Math.floor(rating);
      return (
        <div className="relative flex items-center gap-1">
          {Array.from(Array(5).keys()).map((index) => {
            return (
              <div key={index.toString()} className="relative h-5 w-5 shrink">
                <Icons.starRating className="h-full w-full text-shamiri-light-grey" />
              </div>
            );
          })}
          <div className="absolute inset-0 flex items-center gap-1 text-shamiri-light-orange">
            {Array.from(Array(Math.floor(rating)).keys()).map((index) => {
              return <Icons.starRating key={index} className="h-5 w-5" />;
            })}
            {remainder > 0 ? (
              <div className="relative h-5 w-5 shrink">
                <Icons.starRating className="h-full w-full text-transparent" />
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${remainder * 100}%` }}
                >
                  <Icons.starRating className="h-5 w-5" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      );
    },
    header: "Average Rating",
    id: "Average Rating",
  },
  {
    accessorKey: "cellNumber",
    id: "Phone Number",
    header: "Phone Number",
    cell: ({ row }) => {
      return RenderParsedPhoneNumber(row.original.cellNumber ?? undefined);
    },
  },
  {
    accessorKey: "groupName",
    id: "Group Name",
    header: "Group",
  },
  {
    id: "Group Type",
    header: "Group Type",
    cell: ({ row }) => {
      const type = row.original.groupType;
      return (
        type && (
          <Badge
            variant={type === "TREATMENT" ? "default" : "outline-solid"}
            className="capitalize"
          >
            {type?.toLowerCase()}
          </Badge>
        )
      );
    },
  },
  {
    id: "button",
    cell: ({ row }) => (
      <FellowAttendanceMenu
        state={state}
        attendance={row.original}
        disabled={!row.getCanSelect()}
      />
    ),
    enableHiding: false,
  },
];
