"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import HubDatatableMenu from "./hub-datatable-menu";

import type { AdminHub } from "../queries";

export type HubsWithSchools = AdminHub;

export const columns: ColumnDef<HubsWithSchools>[] = [
  {
    id: "checkbox",
    cell: ({ row }) => {
      return (
        <button
          type="button"
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
      const first = row.original.coordinators.toSorted(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      )[0];
      return first?.coordinatorName ?? "";
    },
  },
  {
    accessorKey: "coordinator",
    header: "Hub coordinator phone number",
    id: "Hub coordinator phone number",
    cell: ({ row }) => {
      const first = row.original.coordinators.toSorted(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      )[0];
      return first ? RenderParsedPhoneNumber(first.cellNumber ?? undefined) : "";
    },
  },
  {
    header: "Supervisors | Fellows",
    id: "Supervisors | Fellows",
    cell: ({ row }) => {
      return `${row.original.supervisorsCount} | ${row.original.fellowsCount}`;
    },
  },
  {
    id: "button",
    cell: ({ row }) => <HubDatatableMenu row={row.original} />,
    enableHiding: false,
  },
];
