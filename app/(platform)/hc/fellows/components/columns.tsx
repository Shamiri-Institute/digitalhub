"use client";

import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import AssignFellowSupervisorSelect from "#/app/(platform)/hc/fellows/components/assign-fellow-supervisor-select";
import MainFellowsDatatableMenu from "#/app/(platform)/hc/fellows/components/main-fellows-datatable-menu";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { parsePhoneNumber } from "libphonenumber-js";
import { Dispatch, SetStateAction } from "react";

export type MainFellowTableData = {
  id: string;
  fellowName: string | null;
  fellowEmail: string | null;
  cellNumber: string | null;
  idNumber: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  county: string | null;
  subCounty: string | null;
  mpesaName: string | null;
  mpesaNumber: string | null;
  supervisorId: string | null;
  supervisorName: string | null;
  droppedOut: boolean | null;
  groupCount: number;
  averageRating: number | null;
};

export const columns = (
  supervisors: Prisma.SupervisorGetPayload<{}>[],
  setFellow: Dispatch<SetStateAction<MainFellowTableData | null>>,
  setEditDialog: Dispatch<SetStateAction<boolean>>,
): ColumnDef<MainFellowTableData>[] => {
  return [
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
      id: "Name",
      header: "Name",
    },
    {
      header: "Average Rating",
      cell: ({ row }) => {
        const rating = row.original.averageRating ?? 0;
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
      header: "Status",
      id: "Status",
    },
    {
      accessorKey: "groupCount",
      header: "No. of groups",
      id: "No. of groups",
    },
    {
      header: "Phone Number",
      accessorFn: (row) => {
        return (
          row.cellNumber &&
          parsePhoneNumber(row.cellNumber, "KE").formatNational()
        );
      },
    },
    {
      header: "Supervisor",
      cell: ({ row }) => (
        <div className="flex">
          <AssignFellowSupervisorSelect
            fellowId={row.original.id}
            supervisorId={row.original.supervisorId}
            supervisors={supervisors}
          />
        </div>
      ),
    },
    {
      accessorKey: "fellowEmail",
      id: "Email",
      header: "Email",
    },
    {
      accessorKey: "gender",
      id: "Gender",
      header: "Gender",
    },
    {
      accessorKey: "county",
      id: "County",
      header: "County",
    },
    {
      accessorKey: "subCounty",
      id: "Sub-county",
      header: "Sub-county",
    },
    {
      id: "button",
      cell: ({ row }) => (
        <MainFellowsDatatableMenu
          fellow={row.original}
          setFellow={setFellow}
          setEditDialog={setEditDialog}
        />
      ),
      enableHiding: false,
    },
  ];
};
