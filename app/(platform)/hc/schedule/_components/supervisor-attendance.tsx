import DataTable from "#/app/(platform)/hc/components/data-table";
import { SessionDetail } from "#/app/(platform)/hc/schedule/_components/session-list";
import { markManySupervisorAttendance } from "#/app/(platform)/hc/schedule/actions/supervisor-attendance";
import { SupervisorAttendanceContext } from "#/app/(platform)/hc/schedule/context/supervisor-attendance-dialog-context";
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
import { toast } from "#/components/ui/use-toast";
import { fetchSupervisorAttendances } from "#/lib/actions/fetch-supervisors";
import { cn } from "#/lib/utils";
import { SessionStatus } from "@prisma/client";
import { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/table-core";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

export default function SupervisorAttendance() {
  const context = useContext(SupervisorAttendanceContext);
  const [attendances, setAttendances] = useState<
    SupervisorAttendanceTableData[]
  >([]);

  useEffect(() => {
    try {
      const fetchAttendances = async () => {
        const attendances = await fetchSupervisorAttendances({
          where: {
            school: {
              id: context.session?.schoolId,
            },
            session: {
              id: context.session?.id,
            },
          },
        });
        const tableData = attendances.map((attendance) => {
          const totalAttendedFellows = attendance.supervisor.fellows.filter(
            (fellow) => {
              const attended = fellow.fellowAttendances.find(
                (attendance) => attendance.sessionId === context.session?.id,
              );
              if (attended) {
                return fellow;
              }
            },
          );
          return {
            id: attendance.id,
            supervisorId: attendance.supervisor.id,
            supervisorName: attendance.supervisor.supervisorName ?? "",
            pointSchools: attendance.supervisor.assignedSchools.map(
              (school) => school.schoolName,
            ),
            attendance: attendance.attended,
            phoneNumber: attendance.supervisor.cellNumber ?? "",
            fellows:
              totalAttendedFellows.length +
              "/" +
              attendance.supervisor.fellows.length,
          };
        });
        setAttendances(tableData);
      };
      fetchAttendances();
    } catch (error: unknown) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Fetch failed!",
        description:
          "Something went wrong while fetching supervisor data, please try again.",
      });
    }
  }, [context.isOpen, context.session]);

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
                session={context.session}
                layout={"compact"}
                withDropdown={false}
              />
            )}
            <SupervisorAttendanceDataTable
              columns={columns() as ColumnDef<unknown>[]}
              data={attendances}
              onChangeData={setAttendances}
              closeDialogFn={context.setIsOpen}
              columnVisibility={{
                checkbox: context.session?.occurred ?? true,
              }}
            />
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}

export function SupervisorAttendanceDataTable({
  columns,
  data,
  onChangeData,
  closeDialogFn,
  emptyStateMessage = "No supervisors associated with this session",
  columnVisibility,
}: {
  columns: ColumnDef<unknown>[];
  data: SupervisorAttendanceTableData[];
  onChangeData: Dispatch<SetStateAction<SupervisorAttendanceTableData[]>>;
  closeDialogFn?: Dispatch<SetStateAction<boolean>>;
  emptyStateMessage?: string;
  columnVisibility?: VisibilityState;
}) {
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  async function batchMarkAttendances(attended: boolean | null) {
    setLoading(true);
    try {
      const ids = (selectedRows as SupervisorAttendanceTableData[]).map(
        (row) => row.id,
      );
      const response = await markManySupervisorAttendance(ids, attended);
      if (response.success) {
        let attendancesCopy = [...data];
        attendancesCopy = attendancesCopy.map((attendance) => {
          if (ids.includes(attendance.id)) {
            attendance.attendance = attended;
          }
          return attendance;
        });
        onChangeData(attendancesCopy);
        setLoading(false);
        toast({
          variant: "default",
          title: response.data?.count + " rows marked successfully",
        });
      }
    } catch (error: unknown) {
      console.log(error);
      setLoading(false);
      toast({
        variant: "destructive",
        description: "Something went wrong, please try again",
      });
    }
  }
  return (
    <div className="space-y-4 pt-2">
      {/* TODO: https://github.com/TanStack/table/issues/4382 --> ColumnDef types gives typescript error */}
      <DataTable
        columns={columns}
        data={data}
        editColumns={false}
        className={"data-table data-table-action"}
        emptyStateMessage={emptyStateMessage}
        onRowSelectionChange={setSelectedRows as () => {}}
        columnVisibilityState={columnVisibility}
      />
      <div className="flex justify-end gap-4">
        {selectedRows.length > 0 ? (
          <div className="flex items-center justify-end gap-3">
            <div className="px-3 text-sm">
              {loading ? (
                <div className="flex items-center gap-2 text-shamiri-new-blue">
                  <span>Updating rows</span>
                  <Icons.hourglass className={"h-3.5 w-3.5 animate-pulse"} />
                </div>
              ) : selectedRows.length === 1 ? (
                <span className="text-shamiri-text-dark-grey/50">
                  Mark row as:
                </span>
              ) : selectedRows.length > 1 ? (
                <span className="text-shamiri-text-dark-grey/50">
                  Mark {selectedRows.length} rows as:
                </span>
              ) : null}
            </div>
            <Button
              variant="ghost"
              className="hover:bg-blue-bg active:scale-x-95"
              disabled={loading}
              onClick={() => {
                batchMarkAttendances(null);
              }}
            >
              <div className="flex items-center gap-2 text-shamiri-new-blue">
                <Icons.helpCircle className="h-4 w-4" />
                <span>Not marked</span>
              </div>
            </Button>

            <Button
              variant="ghost"
              className="hover:bg-red-bg active:scale-x-95"
              disabled={loading}
              onClick={() => {
                batchMarkAttendances(false);
              }}
            >
              <div className="flex items-center gap-2 text-shamiri-light-red">
                <Icons.crossCircleFilled className="h-4 w-4" />
                <span>Missed</span>
              </div>
            </Button>

            <Button
              variant="ghost"
              className="hover:bg-green-bg active:scale-x-95"
              disabled={loading}
              onClick={() => {
                batchMarkAttendances(true);
              }}
            >
              <div className="flex items-center gap-2 text-shamiri-green">
                <Icons.checkCircle className="h-4 w-4" />
                <span>Attended</span>
              </div>
            </Button>
          </div>
        ) : null}
        {closeDialogFn && (
          <Button
            type="button"
            disabled={loading}
            className="border-0 bg-shamiri-new-blue text-white hover:bg-shamiri-new-blue/80"
            onClick={() => {
              closeDialogFn(false);
            }}
          >
            Done
          </Button>
        )}
      </div>
    </div>
  );
}

export type SupervisorAttendanceTableData = {
  id: string;
  supervisorId: string;
  supervisorName: string;
  pointSchools?: string[];
  attendance?: boolean | null;
  phoneNumber: string;
  fellows: string;
  schoolName?: string;
  sessionType?: string;
  occurred?: boolean | null;
  sessionStatus?: SessionStatus | null;
  sessionDate?: Date;
};

export const columns = () => {
  const columnHelper = createColumnHelper<SupervisorAttendanceTableData>();
  return [
    columnHelper.accessor("id", {
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
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
            className={
              "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
            }
          />
        </div>
      ),
      id: "checkbox",
    }),
    {
      id: "name",
      accessorKey: "supervisorName",
      header: "Name",
    },
    columnHelper.accessor("attendance", {
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
    }),
    columnHelper.accessor("pointSchools", {
      cell: (props) => {
        const schools = props.getValue();
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
    }),
    {
      accessorKey: "phoneNumber",
      header: "Phone number",
      id: "phoneNumber",
    },
    {
      accessorKey: "fellows",
      header: "No. of fellows",
      id: "fellows",
    },
    columnHelper.accessor("attendance", {
      cell: (props) => {
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
              <DropdownMenuContent
                align="end"
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                }}
              >
                <DropdownMenuLabel>
                  <span className="text-xs font-medium uppercase text-shamiri-text-grey">
                    Actions
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Mark delayed attendance</DropdownMenuItem>
                <DropdownMenuItem>Fellow attendance history</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        );
      },
      id: "button",
      header: undefined,
    }),
  ];
};
