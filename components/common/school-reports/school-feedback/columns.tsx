"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import type { SchoolFeedbackType } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import SchoolFeedbackDropdownMenu from "#/components/common/school-reports/school-feedback/school-feedback-action-dropdown";
import { Checkbox } from "#/components/ui/checkbox";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";

export const columns: ColumnDef<SchoolFeedbackType>[] = [
  {
    id: "button",
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
    accessorKey: "schoolName",
    header: "School name",
  },
  {
    accessorKey: "studentTeacherSatisfaction",
    header: "(Avg). Student & teacher satisfaction",
    cell: ({ row }) => {
      const studentTeacherSatisfaction = row.original.studentTeacherSatisfaction;
      return <DataTableRatingStars rating={studentTeacherSatisfaction} />;
    },
    id: "Student teacher satisfaction",
  },
];

export const subColumns: ColumnDef<SchoolFeedbackType["supervisorRatings"][number]>[] = [
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
    header: "Supervisor name",
  },
  {
    accessorKey: "studentTeacherSatisfaction",
    header: "Student & teacher satisfaction",
    cell: ({ row }) => {
      const studentTeacherSatisfaction = Number(row.original.studentTeacherSatisfaction);
      return <DataTableRatingStars rating={studentTeacherSatisfaction ?? 0} />;
    },
    id: "Student & teacher satisfaction",
  },
  {
    id: "button",
    cell: ({ row }) => <SchoolFeedbackDropdownMenu feedback={row.original} />,
    enableHiding: false,
  },
];
