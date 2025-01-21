"use client";

import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { SchoolFeedbackType } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import SchoolFeedbackDropdownMenu from "#/components/common/school-reports/school-feedback/school-feedback-action-dropdown";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

export const columns: ColumnDef<SchoolFeedbackType>[] = [
  {
    id: "button",
    cell: ({ row }) => {
      return (
        <div className="px-4 py-2">
          <Image
            unoptimized
            priority
            src={ArrowDownIcon}
            alt="Arrow Down Icon"
            width={16}
            height={16}
          />
        </div>
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
    header: "Student & teacher satisfaction",
    cell: ({ row }) => {
      const studentTeacherSatisfaction =
        row.original.studentTeacherSatisfaction;
      return <DataTableRatingStars rating={studentTeacherSatisfaction} />;
    },
    id: "Student teacher satisfaction",
  },

  {
    id: "button",
    cell: ({ row }) => <SchoolFeedbackDropdownMenu feedback={row.original} />,
    enableHiding: false,
  },
];
