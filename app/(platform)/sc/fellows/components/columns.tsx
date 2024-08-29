'use client'
import { Checkbox } from "#/components/ui/checkbox";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";

// export type FellowsData = {
//   id: string;
//   fellowName: string;
//   sessionsAttended: number;
//   mpesaNumber: string;
//   county: string;
//   numClinicalCases?: number;
//   nextSession?: number; // TODO: confirm this
//   groupRating: number;
//   fellowRating: number;
//   createdAt: number;
//   phoneNumber: string;
//   upcomingSessions?: {
//     schoolName: string;
//     sessionType: string;
//     groupNumber: string;
//     numStudents: string;
//   }[];
// };

export type FellowsData = Prisma.FellowGetPayload<{}>;

export const columns: ColumnDef<FellowsData>[] = [
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
    accessorKey: "fellowName",
    header: "Name",
  },
];
