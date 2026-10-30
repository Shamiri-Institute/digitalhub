"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";

import type { AdminHub } from "../queries";

export const columns: ColumnDef<AdminHub>[] = [
  {
    accessorKey: "hubName",
    header: "Hub name",
    id: "Hub name",
    cell: ({ row }) => (
      <Link href={`/admin/hubs/${row.original.id}`} className="hover:underline">
        {row.original.hubName}
      </Link>
    ),
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
    cell: ({ row }) => (
      <Link
        href={`/admin/hubs/${row.original.id}`}
        aria-label={`Open ${row.original.hubName}`}
        className="absolute inset-0 flex items-center justify-center border-l text-shamiri-text-grey hover:text-shamiri-new-blue"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    ),
    enableHiding: false,
  },
];
