"use client";

import { AllSupervisorsDataTableMenu } from "#/app/(platform)/hc/supervisors/components/main-supervisors-datatable";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { parsePhoneNumber } from "libphonenumber-js";

export type SupervisorsData = Prisma.SupervisorGetPayload<{
  include: {
    assignedSchools: true;
    fellows: true;
    hub: {
      include: {
        project: true;
      };
    };
    monthlySupervisorEvaluation: true;
  };
}>;

export const columns: ColumnDef<SupervisorsData>[] = [
  {
    id: "checkbox",
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
      return (
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
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "supervisorName",
    header: "Name",
    id: "Name",
  },
  {
    header: "Assigned school",
    cell: ({ row }) => {
      const schools = row.original.assignedSchools;

      if (schools.length === 0) {
        return null;
      }

      if (schools.length > 1) {
        return (
          <div className="relative flex items-center">
            <span>{schools[0]?.schoolName},</span>
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
                      return (
                        <span key={index.toString()}>{school.schoolName}</span>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </div>
        );
      }
      return <span>{schools[0]?.schoolName}</span>;
    },
  },
  {
    header: "Status",
    cell: ({ row }) =>
      row.original.archivedAt || row.original.droppedOut ? (
        <Badge variant="destructive">Inactive</Badge>
      ) : (
        <Badge variant="shamiri-green">Active</Badge>
      ),
  },
  {
    header: "Average Rating",
    cell: ({ row }) => {
      const evaluations = row.original.monthlySupervisorEvaluation;
      const rating =
        evaluations
          .map((evaluation) => {
            const {
              respectfulness,
              attitude,
              collaboration,
              identificationOfIssues,
              reliability,
              adaptability,
              communicationStyle,
              decisionMaking,
              conflictResolution,
              leadership,
              recognitionAndFeedback,
              fellowRecruitmentEffectiveness,
              fellowTrainingEffectiveness,
              programLogisticsCoordination,
              programSessionAttendance,
            } = evaluation;

            return (
              (respectfulness +
                attitude +
                collaboration +
                identificationOfIssues +
                reliability +
                adaptability +
                communicationStyle +
                decisionMaking +
                conflictResolution +
                leadership +
                recognitionAndFeedback +
                fellowRecruitmentEffectiveness +
                fellowTrainingEffectiveness +
                programLogisticsCoordination +
                programSessionAttendance) /
              15
            );
          })
          .reduce((a, b) => a + b, 0) / evaluations.length;
      const remainder = rating - Math.floor(rating);
      const rounded = Number(rating).toFixed(1);
      return (
        <div className="flex items-center gap-2">
          <div className="relative flex items-center gap-1">
            {Array.from(Array(5).keys()).map((index) => {
              return (
                <div key={index.toString()} className="relative h-5 w-5 shrink">
                  <Icons.starRating className="h-full w-full text-shamiri-light-grey" />
                </div>
              );
            })}
            {!isNaN(rating) && (
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
            )}
          </div>
          <div className="text-shamiri-text-grey">
            {isNaN(rating) ? "0.0" : rounded}
          </div>
        </div>
      );
    },
    id: "Average Rating",
  },
  {
    header: "No. of fellows",
    id: "No. of fellows",
    cell: ({ row }) => {
      const activeFellows = row.original.fellows.filter(
        (fellow) => !fellow.droppedOut,
      );
      return activeFellows.length + "/" + row.original.fellows.length;
    },
  },
  {
    header: "Phone Number",
    id: "Phone number",
    accessorFn: (row) => {
      return (
        row.cellNumber &&
        parsePhoneNumber(row.cellNumber, "KE").formatNational()
      );
    },
  },
  {
    header: "Gender",
    id: "Gender",
    accessorKey: "gender",
  },
  {
    header: "County",
    id: "county",
    accessorKey: "county",
  },
  {
    header: "Sub-county",
    id: "subCounty",
    accessorKey: "subCounty",
  },
  {
    id: "button",
    cell: ({ row }) => (
      <AllSupervisorsDataTableMenu supervisor={row.original} />
    ),
    enableHiding: false,
  },
];
