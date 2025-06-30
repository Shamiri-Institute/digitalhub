"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import type { SessionReportType } from "#/app/(platform)/sc/reporting/school-reports/session/actions";
import SessionDropdownMenu from "#/components/common/school-reports/session/session-action-dropdown";
import { Checkbox } from "#/components/ui/checkbox";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";

export const columns: ColumnDef<SessionReportType>[] = [
  {
    id: "button",
    cell: ({ row }) => {
      return (
        <button onClick={row.getToggleExpandedHandler()} className="cursor-pointer px-4 py-2">
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
    accessorKey: "avgStudentBehaviour",
    header: "Avg. student behaviour",
    cell: ({ row }) => {
      const studentBehaviour = row.original.avgStudentBehaviour;
      return <DataTableRatingStars rating={studentBehaviour} />;
    },
    id: "Avg. student behaviour",
  },
  {
    accessorKey: "avgAdminSupport",
    header: "Avg. admin support",
    cell: ({ row }) => {
      const adminSupport = row.original.avgAdminSupport;
      return <DataTableRatingStars rating={adminSupport} />;
    },
    id: "Avg. admin support",
  },
  {
    accessorKey: "avgWorkload",
    header: "Avg. workload",
    cell: ({ row }) => {
      const workload = row.original.avgWorkload;
      return <DataTableRatingStars rating={workload} />;
    },
    id: "Avg. workload",
  },
];

export const subColumns: ColumnDef<SessionReportType["session"][number]>[] = [
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
    accessorKey: "session",
    header: "Session",
  },
  {
    accessorKey: "avgStudentBehaviour",
    header: "Student behaviour",
    cell: ({ row }) => {
      const studentBehaviour = row.original.avgStudentBehaviour;
      return <DataTableRatingStars rating={studentBehaviour} />;
    },
    id: "Student behaviour",
  },
  {
    accessorKey: "adminSupport",
    header: "Admin support",
    cell: ({ row }) => {
      const adminSupport = row.original.avgAdminSupport;
      return <DataTableRatingStars rating={adminSupport} />;
    },
    id: "Avg. admin support",
  },
  {
    accessorKey: "workload",
    header: "Workload",
    cell: ({ row }) => {
      const workload = row.original.avgWorkload;
      return <DataTableRatingStars rating={workload} />;
    },
    id: "Avg. workload",
  },
  {
    id: "button",
    cell: ({ row }) => <SessionDropdownMenu sessionReportData={row.original} />,
    enableHiding: false,
  },
];
