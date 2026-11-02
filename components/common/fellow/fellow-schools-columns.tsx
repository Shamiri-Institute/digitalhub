"use client";
import type { ImplementerRole } from "#/db/enums";
import type { ColumnDef } from "@tanstack/react-table";
import { format, isAfter } from "date-fns";
import Image from "next/image";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import type { FellowsData } from "#/app/(platform)/sc/actions";
import FellowSchoolDatatableDropdownMenu, {
  type FellowGroupData,
} from "#/components/common/fellow/fellow-school-datatable-dropdown-menu";
import { Badge } from "#/components/ui/badge";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import { Checkbox } from "#/components/ui/checkbox";
import { sortBy } from "#/lib/table-view";
import { sessionDisplayName } from "#/lib/utils";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import FellowsTableDropdown from "./fellow-schools-datatable-dropdown-menu";

export type FellowDialogKind = "weeklyEvaluation" | "attendanceHistory" | "complaints";

export type FellowGroupDialogKind = "markAttendance" | "students" | "groupEvaluation";

function nextUpcomingSession({ school }: FellowGroupData) {
  return school.interventionSessions
    .filter((session) => isAfter(session.sessionDate, new Date()))
    .toSorted((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime())[0];
}

export const fellowSchoolsColumns = ({
  state,
}: {
  state: {
    openDialog: (kind: FellowDialogKind, fellow: FellowsData) => void;
    openEditDialog: (fellow: FellowsData) => void;
    role: ImplementerRole;
  };
}): ColumnDef<FellowsData>[] => [
  {
    id: "checkbox",
    cell: ({ row }) => {
      return (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          className="cursor-pointer px-4 py-2"
        >
          {row.getIsExpanded() ? (
            <Image
              unoptimized
              priority
              src={ArrowUpIcon}
              alt="Telephone Icon"
              width={16}
              height={16}
            />
          ) : (
            <Image
              unoptimized
              priority
              src={ArrowDownIcon}
              alt="Arrow Down Icon"
              width={16}
              height={16}
            />
          )}
        </button>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "fellowName",
    header: "Name",
    id: "Name",
  },
  {
    header: "Average Rating",
    cell: ({ row }) => {
      const rating = row.original.averageRating;
      return <DataTableRatingStars rating={rating} />;
    },
    id: "Average Rating",
  },
  {
    cell: ({ row }) =>
      row.original.droppedOut ? (
        <Badge variant="destructive">Inactive</Badge>
      ) : (
        <Badge variant="shamiri-green">Active</Badge>
      ),
    header: "Active Status",
    id: "Active Status",
  },
  {
    id: "Sessions Attended",
    header: "Sessions Attended",
    cell: ({ row }) => {
      const attendedSessions = row.original.attendances.filter((attendance) => attendance.attended);
      const groupSessions = row.original.groups.reduce((total, group) => {
        return total + group.school.interventionSessions.length;
      }, 0);
      return `${attendedSessions.length}/${groupSessions}`;
    },
  },
  {
    accessorKey: "mpesaNumber",
    header: "MPESA Number",
    id: "MPESA Number",
    cell: ({ row }) => {
      return RenderParsedPhoneNumber(row.original.mpesaNumber ?? undefined);
    },
  },
  {
    accessorKey: "fellowEmail",
    header: "Fellow Email",
    id: "Fellow Email",
  },
  {
    accessorKey: "cellNumber",
    header: "Phone Number",
    id: "Phone Number",
  },
  {
    accessorKey: "county",
    header: "County",
    id: "County",
  },
  {
    accessorKey: "subCounty",
    header: "Sub-county",
    id: "Sub-county",
  },
  {
    accessorKey: "gender",
    header: "Gender",
    id: "Gender",
  },
  {
    id: "button",
    cell: ({ row }) => <FellowsTableDropdown fellowRow={row.original} state={state} />,
    enableHiding: false,
  },
];

export const subColumns = ({
  state,
}: {
  state: {
    openDialog: (kind: FellowGroupDialogKind, group: FellowGroupData) => void;
    role: ImplementerRole;
  };
}): ColumnDef<FellowGroupData>[] => [
  {
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        disabled={true}
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
            disabled={true}
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
    accessorKey: "school.schoolName",
    header: "School Name",
  },
  {
    header: "Upcoming session",
    id: "Upcoming session",
    accessorFn: (group) => {
      const firstUpcoming = nextUpcomingSession(group);
      if (firstUpcoming) {
        return `${sessionDisplayName(firstUpcoming.session?.sessionName)} - ${format(
          firstUpcoming.sessionDate,
          "dd MMM yyyy",
        )}`;
      }
      return null;
    },
    sortingFn: sortBy((group) => nextUpcomingSession(group)?.sessionDate),
  },
  {
    accessorKey: "groupName",
    header: "Group Name",
  },
  {
    accessorKey: "numberOfStudents",
    header: "Number of Students",
    accessorFn: ({ students }) => {
      return students.length;
    },
  },
  {
    id: "button",
    cell: ({ row }) => <FellowSchoolDatatableDropdownMenu group={row.original} state={state} />,
    enableHiding: false,
  },
];

export const studentsTableColumns: ColumnDef<
  FellowsData["sessions"][number]["students"][number]
>[] = [
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
  },
  {
    accessorKey: "studentName",
    header: "Student Name",
  },
  {
    accessorKey: "visibleId",
    header: "Shamiri ID",
  },
  {
    accessorKey: "age",
    header: "Age",
  },
  {
    accessorKey: "numClinicalCases",
    header: "Clinical Cases",
  },
];
