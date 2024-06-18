import DataTable from "#/app/(platform)/hc/components/data-table";
import { SessionDetail } from "#/app/(platform)/hc/schedule/_components/session-list";
import type { Session } from "#/app/(platform)/hc/schedule/_components/sessions-provider";
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
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/table-core";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export default function FellowAttendance({
  isOpen,
  onChange,
  session,
}: {
  isOpen: boolean;
  onChange: Dispatch<SetStateAction<boolean>>;
  session: Session;
}) {
  const columnHelper = createColumnHelper<
    Prisma.FellowAttendanceGetPayload<{
      include: {
        fellow: {
          include: {
            weeklyFellowRatings: true;
          };
        };
        group: true;
      };
    }>
  >();
  const columns = [
    {
      id: "name",
      accessorKey: "fellow.fellowName",
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
                  "border-blue-border": attended === undefined,
                },
                {
                  "bg-green-bg": attended,
                  "bg-red-bg": !attended,
                  "bg-blue-bg": attended === undefined,
                },
              )}
            >
              {attended === undefined ? (
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
      header: "Point Schools",
    }),
    columnHelper.accessor("fellow.weeklyFellowRatings", {
      cell: (props) => {
        const ratings: Prisma.WeeklyFellowRatingsGetPayload<{}>[] =
          props.getValue();

        const avgBehaviorRating = ratings.reduce((a, b) => {
          return b.behaviourRating !== null ? a + b.behaviourRating : a;
        }, 0);

        const avgPunctualityRating = ratings.reduce((a, b) => {
          return b.punctualityRating !== null ? a + b.punctualityRating : a;
        }, 0);

        const avgDressingAndGroomingRating = ratings.reduce((a, b) => {
          return b.dressingAndGroomingRating !== null
            ? a + b.dressingAndGroomingRating
            : a;
        }, 0);

        const avgProgramDeliveryRating = ratings.reduce((a, b) => {
          return b.programDeliveryRating !== null
            ? a + b.programDeliveryRating
            : a;
        }, 0);

        const avg =
          (avgBehaviorRating +
            avgPunctualityRating +
            avgDressingAndGroomingRating +
            avgProgramDeliveryRating) /
          4;

        const remainder = avg - Math.floor(avg);
        return (
          <div className="flex items-center gap-1 text-shamiri-light-orange">
            {Array.from(Array(Math.floor(avg)).keys()).map((index) => {
              return <Icons.starRating key={index} className="h-5 w-5" />;
            })}
            {remainder > 0 ? (
              <div className="relative h-5 w-5 shrink">
                <Icons.starRating className="h-full w-full text-shamiri-light-grey" />
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: remainder * 100 + "%" }}
                >
                  <Icons.starRating className="h-5 w-5" />
                </div>
              </div>
            ) : null}
          </div>
        );
      },
      header: "Average Rating",
    }),
    {
      accessorKey: "fellow.cellNumber",
      header: "Phone number",
    },
    {
      accessorKey: "group.groupName",
      header: "Group No.",
    },
  ];

  const [attendances, setAttendances] = useState<
    Prisma.SupervisorAttendanceGetPayload<{
      include: {
        supervisor: true;
        session: {
          include: {
            fellowAttendances: {
              include: {
                fellow: {
                  include: {
                    weeklyFellowRatings: true;
                  };
                };
                group: true;
              };
            };
          };
        };
      };
    }>[]
  >([]);
  const [fellowAttendances, setFellowAttendances] = useState<
    Prisma.FellowAttendanceGetPayload<{}>[]
  >([]);

  useEffect(() => {
    try {
      const fetchAttendances = async () => {
        const supervisorAttendances = await fetchSupervisorAttendances({
          where: {
            school: {
              hubId: session.school.hubId,
            },
            session: {
              id: session.id,
            },
          },
        });
        setAttendances(supervisorAttendances);
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
  }, [isOpen]);

  const form = useForm<{ supervisor: string }>({});

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={onChange} modal={true}>
        <DialogPortal>
          <DialogContent className="w-3/4 max-w-none">
            <DialogHeader>
              <span className="text-xl font-bold">View fellow attendance</span>
            </DialogHeader>
            <SessionDetail
              session={session}
              layout={"compact"}
              withDropdown={false}
            />
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
                          const supervisorAttendance = attendances.find(
                            (attendance) => attendance.supervisorId === value,
                          );
                          if (supervisorAttendance !== undefined) {
                            const currentSupervisorFellowAttendances =
                              supervisorAttendance.session.fellowAttendances.filter(
                                (attendance) => {
                                  return attendance.supervisorId === value;
                                },
                              );
                            setFellowAttendances(
                              currentSupervisorFellowAttendances,
                            );
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a supervisor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {attendances.map((attendance) => (
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
              <DataTable
                columns={columns as ColumnDef<unknown>[]}
                data={fellowAttendances}
                editColumns={false}
                className={"data-table"}
                emptyStateMessage="No fellows associated with this session"
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
