"use client";

import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import type { WeeklyFellowEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/types";
import WeeklyFellowEvaluationDropdownMenu from "#/components/common/fellow-reports/weekly-fellow-evaluation/weekly-fellow-evaluation-dropdown";
import { Checkbox } from "#/components/ui/checkbox";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

export const columns: ColumnDef<WeeklyFellowEvaluation>[] = [
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
    accessorKey: "fellowName",
    header: "Fellow name",
  },
  {
    accessorKey: "avgBehaviour",
    header: "Avg. behaviour",
    cell: ({ row }) => {
      const behaviour = row.original.avgBehaviour;
      return <DataTableRatingStars rating={behaviour} />;
    },
    id: "Avg. behaviour",
  },
  {
    accessorKey: "avgProgramDelivery",
    header: "Avg. program delivery",
    cell: ({ row }) => {
      const programDelivery = row.original.avgProgramDelivery;
      return <DataTableRatingStars rating={programDelivery} />;
    },
    id: "Avg. program delivery",
  },
  {
    accessorKey: "avgDressingGrooming",
    header: "Avg. dressing & grooming",
    cell: ({ row }) => {
      const dressingGrooming = row.original.avgDressingGrooming;
      return <DataTableRatingStars rating={dressingGrooming} />;
    },
    id: "Avg. dressing & grooming",
  },
];

export const subColumns: ColumnDef<WeeklyFellowEvaluation["week"][number]>[] = [
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
    accessorKey: "week",
    header: "Week",
  },
  {
    accessorKey: "behaviour",
    header: "Behaviour",
    cell: ({ row }) => {
      const behaviour = row.original.behaviour;
      return <DataTableRatingStars rating={behaviour ?? 0} />;
    },
    id: "Behaviour",
  },
  {
    accessorKey: "programDelivery",
    header: "Program delivery",
    cell: ({ row }) => {
      const programDelivery = row.original.programDelivery;
      return <DataTableRatingStars rating={programDelivery ?? 0} />;
    },
    id: "Program delivery",
  },
  {
    accessorKey: "dressingGrooming",
    header: "Dressing & grooming",
    cell: ({ row }) => {
      const dressingGrooming = row.original.dressingGrooming;
      return <DataTableRatingStars rating={dressingGrooming ?? 0} />;
    },
    id: "Dressing & grooming",
  },
  {
    accessorKey: "attendancePunctuality",
    header: "Attendance & punctuality",
    cell: ({ row }) => {
      const attendancePunctuality = row.original.attendancePunctuality;
      return <DataTableRatingStars rating={attendancePunctuality ?? 0} />;
    },
    id: "Attendance & punctuality",
  },
  {
    id: "button",
    cell: ({ row }) => <WeeklyFellowEvaluationDropdownMenu weeklyFellowEvaluation={row.original} />,
    enableHiding: false,
  },
];
