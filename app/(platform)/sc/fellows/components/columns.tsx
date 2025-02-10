"use client";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import type { FellowsData } from "#/app/(platform)/sc/actions";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { Dispatch, SetStateAction } from "react";
import FellowsSessionsTableDropdownMenu from "./fellows-sessions-table-dropdown-menu";
import FellowsTableDropdown from "./fellows-table-dropdown-menu";

export const columns = (state: {
  setWeeklyEvaluationDialog: Dispatch<SetStateAction<boolean>>;
  setFellow: Dispatch<SetStateAction<FellowsData | null>>;
}): ColumnDef<FellowsData>[] => [
  {
    id: "checkbox",
    cell: ({ row }) => {
      return (
        <button
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
    id: "Sessions attended",
    header: "Sessions attended",
    cell: ({ row }) => {
      const attendedSessions = row.original.attendances.filter(
        (attendance) => attendance.attended,
      );
      const groupSessions = row.original.groups.reduce((total, group) => {
        return total + group.school.interventionSessions.length;
      }, 0);
      return attendedSessions.length + "/" + groupSessions;
    },
    enableHiding: false,
  },
  {
    accessorKey: "mpesaNumber",
    header: "MPESA Number",
  },
  {
    id: "button",
    cell: ({ row }) => (
      <FellowsTableDropdown fellowRow={row.original} state={state} />
    ),
    enableHiding: false,
  },
];

export const subColumns: ColumnDef<FellowsData["sessions"][number]>[] = [
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
    accessorKey: "schoolName",
    header: "School Name",
  },
  {
    accessorKey: "sessionType",
    header: "Session Type",
  },
  {
    accessorKey: "groupName",
    header: "Group Name",
  },
  {
    accessorKey: "numberOfStudents",
    header: "Number of Students",
  },
  {
    id: "button",
    cell: ({ row }) => (
      <FellowsSessionsTableDropdownMenu sessionRow={row.original} />
    ),
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
  // TODO: add dropdown
];
