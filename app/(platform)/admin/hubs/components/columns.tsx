"use client";

import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import HubDatatableMenu from "./hub-datatable-menu";

export type HubsWithSchools = Prisma.HubGetPayload<{
  include: {
    schools: {
      include: {
        assignedSupervisor: true;
        interventionSessions: {
          include: {
            sessionRatings: true;
            session: true;
          };
        };
        students: {
          include: {
            assignedGroup: true;
            _count: {
              select: {
                clinicalCases: true;
              };
            };
          };
        };
      };
    };
    implementer: {
      select: {
        implementerName: true;
      };
    };
    coordinators: true;
    _count: {
      select: {
        fellows: true;
        supervisors: true;
      };
    };
  };
}>;

export const columns: ColumnDef<HubsWithSchools>[] = [
  {
    id: "checkbox",
    cell: ({ row }) => {
      return (
        <button
          onClick={row.getToggleExpandedHandler()}
          className="cursor-pointer px-4 py-2"
        >
          {row.getIsExpanded() ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "hubName",
    header: "Hub name",
    id: "Hub name",
  },
  {
    accessorKey: "implementer.implementerName",
    header: "Implementer",
    id: "Implementer",
  },
  {
    accessorKey: "coordinator",
    header: "Hub coordinator",
    id: "Hub coordinator",
    cell: ({ row }) => {
      return row.original.coordinators.length > 0
        ? row.original.coordinators[0]?.coordinatorName
        : "";
    },
  },
  {
    accessorKey: "coordinator",
    header: "Hub coordinator phone number",
    id: "Hub coordinator phone number",
    cell: ({ row }) => {
      return row.original.coordinators.length > 0
        ? RenderParsedPhoneNumber(
            row.original.coordinators[0]?.cellNumber ?? undefined,
          )
        : "";
    },
  },
  {
    header: "Supervisors | Fellows",
    id: "Supervisors | Fellows",
    cell: ({ row }) => {
      return `${row.original._count.supervisors} | ${row.original._count.fellows}`;
    },
  },
  {
    id: "button",
    cell: ({ row }) => <HubDatatableMenu row={row.original} />,
    enableHiding: false,
  },
];
