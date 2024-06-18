import DataTable from "#/app/(platform)/hc/components/data-table";
import { SessionDetail } from "#/app/(platform)/hc/schedule/_components/session-list";
import type { Session } from "#/app/(platform)/hc/schedule/_components/sessions-provider";
import { markSupervisorAttendance } from "#/app/(platform)/hc/schedule/actions/supervisor-attendance";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
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
import { fetchSupervisorsWithAttendances } from "#/lib/actions/fetch-supervisors";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { cn } from "#/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/table-core";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

type SupervisorAttendanceTableData = {
  id: string;
  supervisorName: string;
  pointSchools: string[];
  attendance?: boolean | null;
  phoneNumber: string;
  fellows: string;
};

type AttendanceData = {
  projectId: string;
  schoolId: string;
  supervisorId: string;
  sessionId: string;
  sessionType: string;
};

export default function SupervisorAttendance({
  isOpen,
  onChange,
  session,
}: {
  isOpen: boolean;
  onChange: Dispatch<SetStateAction<boolean>>;
  session: Session;
}) {
  const [attendances, setAttendances] = useState<
    SupervisorAttendanceTableData[]
  >([]);
  const [loadingIndices, setLoadingIndices] = useState<
    {
      id: string;
      attended: boolean;
    }[]
  >([]);

  const columnHelper = createColumnHelper<SupervisorAttendanceTableData>();
  const columns = [
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
    }),
    columnHelper.accessor("pointSchools", {
      cell: (props) => {
        const schools = props.getValue();
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
    }),
    {
      accessorKey: "phoneNumber",
      header: "Phone number",
    },
    {
      accessorKey: "fellows",
      header: "No. of fellows",
    },
    columnHelper.accessor("attendance", {
      cell: (props) => {
        const attended = props.getValue();
        const data = {
          sessionId: session.id,
          sessionType: session.sessionType,
          projectId: CURRENT_PROJECT_ID,
          schoolId: session.schoolId,
          supervisorId: props.row.original.id,
        };
        if (attended !== null && attended !== undefined) {
          return null;
        } else {
          return (
            <div
              className="absolute inset-0 border-l bg-white"
              onClick={() => {
                markAttendance(data, true);
              }}
            >
              <div className="flex h-full w-full items-center justify-center">
                <Icons.checkCircle className="h-5 w-5 text-shamiri-graph-green" />
              </div>
            </div>
          );
        }
      },
      id: "button",
      header: undefined,
    }),
    columnHelper.accessor("attendance", {
      cell: (props) => {
        const attended = props.getValue();
        const data = {
          sessionId: session.id,
          sessionType: session.sessionType,
          projectId: CURRENT_PROJECT_ID,
          schoolId: session.schoolId,
          supervisorId: props.row.original.id,
        };
        if (attended !== null && attended !== undefined) {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="absolute inset-0 border-l bg-white">
                  <div className="flex h-full w-full items-center justify-center">
                    <Icons.moreHorizontal className="h-5 w-5" />
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
        } else {
          return (
            <div
              className="absolute inset-0 border-l bg-white"
              onClick={() => {
                markAttendance(data, false);
              }}
            >
              <div className="flex h-full w-full items-center justify-center">
                <Icons.crossCircleFilled className="h-5 w-5 text-shamiri-light-red" />
              </div>
            </div>
          );
        }
      },
      id: "button",
      header: undefined,
    }),
  ];

  useEffect(() => {
    try {
      const fetchAttendances = async () => {
        const supervisors = await fetchSupervisorsWithAttendances({
          where: {
            hubId: session.school.hubId,
          },
        });
        const tableData = supervisors.map((supervisor) => {
          const matchingSession = supervisor.supervisorAttendances.find(
            (attendance) => attendance.sessionId === session.id,
          );
          const totalAttendedFellows = supervisor.fellows.filter((fellow) => {
            const attended = fellow.fellowAttendances.find(
              (attendance) => attendance.sessionId === session.id,
            );
            if (attended) {
              return fellow;
            }
          });
          return {
            id: supervisor.id,
            supervisorName: supervisor.supervisorName ?? "",
            pointSchools: supervisor.assignedSchools.map(
              (school) => school.schoolName,
            ),
            attendance: matchingSession?.attended,
            phoneNumber: supervisor.cellNumber ?? "",
            fellows:
              totalAttendedFellows.length + "/" + supervisor.fellows.length,
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
  }, [isOpen, session.school.hubId]);

  function markAttendance(data: AttendanceData, attended?: boolean) {
    markSupervisorAttendance({ ...data, attended }).then((result) => {
      const index = attendances.findIndex(
        (attendance) => attendance.id === result.data?.supervisorId,
      );

      if (index !== -1) {
        let attendancesCopy = [...attendances];
        if (attendancesCopy[index] !== undefined) {
          attendancesCopy[index]!.attendance = attended;
          setAttendances(attendancesCopy);
        }
      }
      console.log("Marked!", attended);
    });
  }

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={onChange} modal={true}>
        <DialogPortal>
          <DialogContent
            className="w-4/5 max-w-none"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <span className="text-xl font-bold">
                Mark supervisor attendance
              </span>
            </DialogHeader>
            <SessionDetail
              session={session}
              layout={"compact"}
              withDropdown={false}
            />
            <div className="space-y-4 pt-2">
              {/* TODO: https://github.com/TanStack/table/issues/4382 --> ColumnDef types gives typescript error */}
              <DataTable
                columns={columns as ColumnDef<unknown>[]}
                data={attendances}
                editColumns={false}
                className={"data-table data-table-action"}
                emptyStateMessage="No fellows associated with this school"
              />
              <div className="flex justify-end gap-6">
                <Button
                  variant="ghost"
                  type="button"
                  className="border-0 text-shamiri-new-blue"
                  onClick={() => {
                    onChange(false);
                  }}
                >
                  Cancel
                </Button>
                <Button className="bg-shamiri-new-blue">Done</Button>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
