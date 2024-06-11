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
import { toast } from "#/components/ui/use-toast";
import { fetchFellowAttendances } from "#/lib/actions/fetch-fellow-attendances";
import { cn } from "#/lib/utils";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/table-core";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

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

        return (
          <div className="flex items-center gap-1 text-shamiri-graph-yellow">
            {Array.from(Array(Math.floor(avg)).keys()).map((index) => {
              return <Icons.starRating key={index} className="h-5 w-5" />;
            })}
            {Math.ceil(avg) - avg !== 0 ? (
              <Icons.starRatingOutline className="h-5 w-5" />
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
    Prisma.FellowAttendanceGetPayload<{}>[]
  >([]);

  useEffect(() => {
    try {
      const fetchAttendances = async () => {
        const fellowAttendances = await fetchFellowAttendances({
          where: {
            session: {
              id: session.id,
            },
          },
          include: {
            fellow: {
              include: {
                weeklyFellowRatings: true,
              },
            },
            group: true,
          },
        });
        setAttendances(fellowAttendances);
        console.log(attendances);
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
            <div className="space-y-4 pt-2">
              <DataTable
                columns={columns as ColumnDef<unknown>[]}
                data={attendances}
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
