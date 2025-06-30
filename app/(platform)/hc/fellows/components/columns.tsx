"use client";

import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import AssignFellowSupervisorSelect from "#/app/(platform)/hc/fellows/components/assign-fellow-supervisor-select";
import MainFellowsDatatableMenu from "#/app/(platform)/hc/fellows/components/main-fellows-datatable-menu";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import type { Prisma } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { ParseError, parsePhoneNumberWithError } from "libphonenumber-js";
import type { Dispatch, SetStateAction } from "react";

export type MainFellowTableData = {
  id: string;
  fellowName: string | null;
  fellowEmail: string | null;
  cellNumber: string | null;
  idNumber: string | null;
  gender: string | null;
  dateOfBirth: string | Date | null;
  county: string | null;
  subCounty: string | null;
  mpesaName: string | null;
  mpesaNumber: string | null;
  supervisorId: string | null;
  supervisorName: string | null;
  droppedOut: boolean | null;
  groupCount?: number;
  averageRating: number | null;
  complaints?: Prisma.FellowComplaintsGetPayload<{
    include: {
      user: true;
    };
  }>[];
  groups?: Prisma.InterventionGroupGetPayload<{
    include: { school: true };
  }>[];
};

export const columns = (
  supervisors: Prisma.SupervisorGetPayload<{}>[],
  setFellow: Dispatch<SetStateAction<MainFellowTableData | null>>,
  setEditDialog: Dispatch<SetStateAction<boolean>>,
  setWeeklyEvaluationDialog: Dispatch<SetStateAction<boolean>>,
  setUploadContractDialog: Dispatch<SetStateAction<boolean>>,
  setUploadIdDialog: Dispatch<SetStateAction<boolean>>,
  setUploadQualificationDialog: Dispatch<SetStateAction<boolean>>,
  setViewComplaintsDialog: Dispatch<SetStateAction<boolean>>,
  setDropOutDialog: Dispatch<SetStateAction<boolean>>,
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
      cell: ({ row }) => {
        try {
          return (
            row.original.cellNumber &&
            parsePhoneNumberWithError(row.original.cellNumber, "KE").formatNational()
          );
        } catch (error) {
          if (error instanceof ParseError) {
            // Not a phone number, non-existent country, etc.
            return (
              row.original.cellNumber && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex gap-1">
                      <Icons.flagTriangleRight className="h-4 w-4 text-shamiri-red" />
                      <span>{row.original.cellNumber}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="px-2 py-1 capitalize">
                      {error.message.toLowerCase().replace("_", " ")}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            );
          }
          throw error;
        }
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
          setWeeklyEvaluationDialog={setWeeklyEvaluationDialog}
          setUploadContractDialog={setUploadContractDialog}
          setUploadIdDialog={setUploadIdDialog}
          setUploadQualificationDialog={setUploadQualificationDialog}
          setViewComplaintsDialog={setViewComplaintsDialog}
          setDropOutDialog={setDropOutDialog}
        />
      ),
      enableHiding: false,
    },
  ];
};
