"use client";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import type { FellowsData } from "#/app/(platform)/sc/actions";
import FellowSchoolDatatableDropdownMenu, {
  FellowGroupData,
} from "#/components/common/fellow/fellow-school-datatable-dropdown-menu";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { sessionDisplayName } from "#/lib/utils";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { ImplementerRole } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { format, isAfter } from "date-fns";
import Image from "next/image";
import { Dispatch, SetStateAction } from "react";
import FellowsTableDropdown from "./fellow-schools-datatable-dropdown-menu";

export const fellowSchoolsColumns = ({
  state,
}: {
  state: {
    setWeeklyEvaluationDialog: Dispatch<SetStateAction<boolean>>;
    setEditFellowDialog: Dispatch<SetStateAction<boolean>>;
    setAttendanceHistoryDialog: Dispatch<SetStateAction<boolean>>;
    setUploadContractDialog: Dispatch<SetStateAction<boolean>>;
    setUploadIdDialog: Dispatch<SetStateAction<boolean>>;
    setUploadQualificationDialog: Dispatch<SetStateAction<boolean>>;
    setComplaintsDialog: Dispatch<SetStateAction<boolean>>;
    setFellow: Dispatch<SetStateAction<FellowsData | null>>;
    role: ImplementerRole;
  };
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
      const attendedSessions = row.original.attendances.filter(
        (attendance) => attendance.attended,
      );
      const groupSessions = row.original.groups.reduce((total, group) => {
        return total + group.school.interventionSessions.length;
      }, 0);
      return attendedSessions.length + "/" + groupSessions;
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
    accessorKey: "mpesaName",
    header: "MPESA Name",
    id: "MPESA Name",
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
    accessorKey: "idNumber",
    header: "ID Number",
    id: "ID Number",
  },
  {
    header: "Date of Birth",
    id: "Date of Birth",
    accessorFn: ({ dateOfBirth }) => {
      return dateOfBirth !== null ? format(dateOfBirth, "dd-MM-yyyy") : null;
    },
  },
  {
    id: "button",
    cell: ({ row }) => (
      <FellowsTableDropdown fellowRow={row.original} state={state} />
    ),
    enableHiding: false,
  },
];

export const subColumns = ({
  state,
}: {
  state: {
    setFellowGroup: Dispatch<SetStateAction<FellowGroupData | undefined>>;
    setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentsDialog: Dispatch<SetStateAction<boolean>>;
    setEvaluationDialog: Dispatch<SetStateAction<boolean>>;
    role: ImplementerRole;
  };
}): ColumnDef<FellowGroupData>[] => [
  {
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        disabled={true}
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
    accessorFn: ({ school }) => {
      const upcomingSessions = school.interventionSessions
        .filter((session) => {
          return isAfter(session.sessionDate, new Date());
        })
        .sort((a, b) => {
          return a.sessionDate.getTime() - b.sessionDate.getTime();
        });

      if (upcomingSessions.length > 0) {
        return (
          sessionDisplayName(upcomingSessions[0]!.session?.sessionName) +
          " - " +
          format(upcomingSessions[0]!.sessionDate, "dd MMM yyyy")
        );
      } else {
        return null;
      }
    },
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
    cell: ({ row }) => (
      <FellowSchoolDatatableDropdownMenu group={row.original} state={state} />
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
