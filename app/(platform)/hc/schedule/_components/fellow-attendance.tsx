import DataTable from "#/app/(platform)/hc/components/data-table";
import { SessionDetail } from "#/app/(platform)/hc/schedule/_components/session-list";
import { fetchSessionFellowAttendances } from "#/app/(platform)/hc/schedule/actions/fellow-attendances";
import { FellowAttendanceContext } from "#/app/(platform)/hc/schedule/context/fellow-attendance-dialog-context";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
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
import { toast } from "#/components/ui/use-toast";
import { fetchSupervisorAttendances } from "#/lib/actions/fetch-supervisors";
import { cn } from "#/lib/utils";
import { Prisma, SessionStatus } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/table-core";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { useForm } from "react-hook-form";

export default function FellowAttendance() {
  const context = useContext(FellowAttendanceContext);
  const [supervisorAttendances, setSupervisorAttendances] = useState<
    Prisma.SupervisorAttendanceGetPayload<{
      include: {
        supervisor: {
          include: {
            fellows: true;
          };
        };
      };
    }>[]
  >([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>();
  const [fellowAttendances, setFellowAttendances] = useState<
    FellowAttendancesTableData[]
  >([]);
  const [fellows, setFellows] = useState<FellowAttendancesTableData[]>([]);

  useEffect(() => {
    try {
      const fetchAttendances = async () => {
        const supervisorAttendances = await fetchSupervisorAttendances({
          where: {
            school: {
              id: context.session?.schoolId,
            },
            session: {
              id: context.session?.id,
            },
            attended: true,
          },
        });
        setSupervisorAttendances(supervisorAttendances);

        const fellowAttendances =
          context.session &&
          (await fetchSessionFellowAttendances({
            sessionId: context.session?.id,
          }));
        setFellowAttendances(fellowAttendances ?? []);
      };
      fetchAttendances();
    } catch (error: unknown) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Fetch failed!",
        description:
          "Something went wrong while fetching attendance data, please try again.",
      });
    }
  }, [context.isOpen, context.session]);

  useEffect(() => {
    const supervisorAttendance = supervisorAttendances.find(
      (attendance) => attendance.supervisorId === selectedSupervisor,
    );
    if (supervisorAttendance !== undefined) {
      const tableData: FellowAttendancesTableData[] =
        supervisorAttendance.supervisor.fellows.map((fellow) => {
          const fellowAttendance = fellowAttendances.find(
            (attendance) => attendance.fellowId === fellow.id,
          );

          if (fellowAttendance === undefined) {
            return {
              fellowId: fellow.id,
              fellowName: fellow.fellowName ?? null,
              cellNumber: fellow.cellNumber ?? null,
              attended: null,
              supervisorId: fellow.supervisorId,
              groupName: null,
              averageRating: null,
            };
          } else return fellowAttendance;
        });
      setFellows(tableData);
    }
  }, [fellowAttendances, selectedSupervisor, supervisorAttendances]);

  useEffect(() => {
    if (!context.isOpen) {
      setFellows([]);
    }
  }, [context.isOpen]);

  const form = useForm<{ supervisor: string }>({});

  return (
    <div>
      <Dialog
        open={context.isOpen}
        onOpenChange={context.setIsOpen}
        modal={true}
      >
        <DialogPortal>
          <DialogContent className="w-3/4 max-w-none">
            <DialogHeader>
              <span className="text-xl font-bold">View fellow attendance</span>
            </DialogHeader>
            {context.session && (
              <SessionDetail
                session={context.session}
                layout={"compact"}
                withDropdown={false}
              />
            )}
            <div className="mb-4">
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="supervisor"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className={"text-sm"}>
                        Select a supervisor
                      </FormLabel>
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
                          {supervisorAttendances.map((attendance) => (
                            <SelectItem
                              key={attendance.supervisorId}
                              value={attendance.supervisorId}
                            >
                              {attendance.supervisor.supervisorName}
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
            <div className="space-y-4 pt-2">
              {/* TODO: https://github.com/TanStack/table/issues/4382 --> ColumnDef types gives typescript error */}
              <FellowAttendanceDataTable
                columns={columns() as ColumnDef<unknown>[]}
                data={fellows}
                editColumns={false}
              />
              <div className="flex justify-end gap-6">
                <Button
                  variant="ghost"
                  type="button"
                  className="border-0 text-shamiri-new-blue"
                  onClick={() => {
                    context.setIsOpen(false);
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

export function FellowAttendanceDataTable({
  columns,
  data,
  editColumns = false,
  closeDialogFn,
  emptyStateMessage = "No fellows associated with this session",
}: {
  columns: ColumnDef<unknown>[];
  data: FellowAttendancesTableData[];
  editColumns?: boolean;
  onChangeData?: Dispatch<SetStateAction<FellowAttendancesTableData[]>>;
  closeDialogFn?: Dispatch<SetStateAction<boolean>>;
  emptyStateMessage?: string;
}) {
  return (
    <div className="space-y-4 pt-2">
      <DataTable
        columns={columns as ColumnDef<unknown>[]}
        data={data}
        editColumns={editColumns}
        className={"data-table"}
        emptyStateMessage={emptyStateMessage}
      />
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
  sessionId?: string;
  fellowId: string;
  fellowName: string | null;
  cellNumber: string | null;
  attended: boolean | null;
  supervisorName?: string | null;
  supervisorId: string | null;
  schoolName?: string | null;
  groupName: string | null;
  averageRating: number | null;
  sessionType?: string;
  occurred?: boolean | null;
  sessionStatus?: SessionStatus | null;
  sessionDate?: Date;
};

export const columns = () => {
  const columnHelper = createColumnHelper<FellowAttendancesTableData>();
  return [
    {
      id: "name",
      accessorKey: "fellowName",
      header: "Name",
    },
    columnHelper.accessor("attended", {
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
              {attended === undefined || attended === null ? (
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
    columnHelper.accessor("averageRating", {
      cell: (props) => {
        const rating = props.getValue() ?? 0;
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
                    style={{ width: remainder * 100 + "%" }}
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
      id: "averageRating",
    }),
    {
      accessorKey: "cellNumber",
      id: "cellNumber",
      header: "Phone Number",
    },
    {
      accessorKey: "groupName",
      id: "groupName",
      header: "Group",
    },
  ];
};
