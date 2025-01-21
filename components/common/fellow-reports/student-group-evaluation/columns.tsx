"use client";

import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { StudentGroupEvaluationType } from "#/components/common/fellow-reports/student-group-evaluation/actions";
import StudentGroupEvaluationDropdownMenu from "#/components/common/fellow-reports/student-group-evaluation/student-group-evaluation-dropdown-actions";
import { Checkbox } from "#/components/ui/checkbox";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

export const columns: ColumnDef<StudentGroupEvaluationType>[] = [
  {
    id: "button",
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
              alt="Arrow Up Icon"
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
    header: "Fellow name",
  },
  {
    accessorKey: "groupName",
    header: "Group name",
  },
  {
    accessorKey: "avgCooperation",
    header: "Avg. cooperation",
    cell: ({ row }) => {
      const cooperation = row.original.avgCooperation;
      return <DataTableRatingStars rating={cooperation} />;
    },
    id: "Avg. cooperation",
  },
  {
    accessorKey: "avgEngagement",
    header: "Avg. engagement",
    cell: ({ row }) => {
      const engagement = row.original.avgEngagement;
      return <DataTableRatingStars rating={engagement} />;
    },
    id: "Avg. engagement",
  },
];

export const subColumns: ColumnDef<
  StudentGroupEvaluationType["session"][number]
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
    accessorKey: "session",
    header: "Session",
  },
  {
    accessorKey: "cooperation",
    header: "Cooperation",
    cell: ({ row }) => {
      const cooperation = row.original.cooperation;
      return <DataTableRatingStars rating={cooperation} />;
    },
    id: "Cooperation",
  },
  {
    accessorKey: "engagement",
    header: "Engagement",
    cell: ({ row }) => {
      const engagement = row.original.engagement;
      return <DataTableRatingStars rating={engagement} />;
    },
    id: "Engagement",
  },
  {
    id: "button",
    cell: ({ row }) => (
      <StudentGroupEvaluationDropdownMenu
        studentGroupEvaluation={row.original}
      />
    ),
    enableHiding: false,
  },
];
