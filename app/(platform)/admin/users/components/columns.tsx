"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { TEAM_LABELS } from "#/db/enums";
import { Badge } from "#/components/ui/badge";
import type { ImplementerAdmin } from "../queries";
import AdminAccessMenu from "./admin-access-menu";

export const columns: ColumnDef<ImplementerAdmin>[] = [
  {
    accessorKey: "adminName",
    header: "Name",
    id: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
    id: "Email",
  },
  {
    accessorKey: "team",
    header: "Team",
    id: "Team",
    cell: ({ row }) => (row.original.team ? TEAM_LABELS[row.original.team] : ""),
  },
  {
    accessorKey: "isSuperAdmin",
    header: "Role",
    id: "Role",
    cell: ({ row }) =>
      row.original.isSuperAdmin ? (
        <Badge variant="shamiri-green">Super admin</Badge>
      ) : (
        <Badge variant="outline-solid">Admin</Badge>
      ),
  },
  {
    id: "button",
    cell: ({ row }) => <AdminAccessMenu admin={row.original} />,
    enableHiding: false,
  },
];
