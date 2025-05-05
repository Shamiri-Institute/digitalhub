"use client";

import { ChevronDownIcon, DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { Member } from "#/app/(platform)/settings/organization/members/page";
import { Icons } from "#/components/icons";
import { UserAvatar } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "#/components/ui/table";
import { cn } from "#/lib/utils";
import { RoleTypes } from "#/models/role";
import { constants } from "#/tests/constants";

import { AddMemberDialog } from "./add-member-dialog";

const MemberRolesOrStateList = [
  ...RoleTypes.map((role) => role.name),
  "Pending invite",
  "Disabled",
];

const columns: ColumnDef<Member>[] = [
  {
    id: "display",
    header: "Display",
    accessorFn: (row) => row.name + row.email,
    cell: ({ row }) => {
      const { email, name, avatarUrl } = row.original;
      return (
        <div className="flex whitespace-nowrap py-5 pr-3 text-sm">
          <div className="flex items-center overflow-hidden text-ellipsis">
            <div className="h-[18px] w-[18px] flex-shrink-0 sm:h-11 sm:w-11">
              <UserAvatar
                className="sm:text- h-[18px] w-[18px] text-xs sm:h-11 sm:w-11"
                src={avatarUrl || ""}
                fallback={name}
                fallbackClasses="text-[8px] sm:text-sm"
              />
            </div>
            <div className="ml-4 overflow-hidden text-ellipsis md:ml-5">
              <div className="hidden font-medium sm:block">{name}</div>
              <div className="overflow-hidden text-ellipsis text-xs font-medium sm:mt-1 sm:w-auto sm:text-sm sm:font-normal sm:text-muted-foreground">
                {email}
              </div>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const { role } = row.original;

      return <div className="text-xs text-primary/80 sm:text-sm">{role}</div>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: () => {
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground"
              >
                <span className="sr-only">Open menu</span>
                <DotsHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Change role</DropdownMenuItem>
              <DropdownMenuItem>Disable user</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export function MembersTable({ members }: { members: Member[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: members,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const [roleFilter, setRoleFilter] = React.useState<string>("All");

  const tableCount = table.getRowModel().rows?.length ?? 0;

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-base">Manage members</CardTitle>
      </CardHeader>
      <CardContent className="bg-transparent p-0">
        <div className="mb-4 flex items-center gap-4 pt-2">
          <div className="relative flex w-full md:max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
              <Icons.search className="h-3 w-3 text-foreground/50 md:h-4 md:w-4" />
            </div>
            <Input
              placeholder="Search by name or email"
              value={
                (table.getColumn("display")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("display")?.setFilterValue(event.target.value)
              }
              className="max-w-sm bg-card pl-6 text-[0.8125rem] md:pl-8 md:text-sm"
            />
            <div className="ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="ml-auto whitespace-nowrap px-2 py-1.5 text-[0.8125rem] font-medium md:px-4 md:py-2 md:text-sm"
                  >
                    {roleFilter}{" "}
                    <ChevronDownIcon className="ml-1 h-4 w-4 md:ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {["All", ...MemberRolesOrStateList].map((role) => {
                    return (
                      <DropdownMenuItem
                        key={role}
                        className="relative flex justify-between pr-10"
                        onSelect={() => {
                          setRoleFilter(role);
                          table
                            .getColumn("role")
                            ?.setFilterValue(role === "All" ? "" : role);
                        }}
                      >
                        {role}
                        {role === roleFilter && (
                          <div className="absolute inset-y-0 right-1 flex flex-col justify-center">
                            <Icons.check className="h-5 text-brand" />
                          </div>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex justify-end md:w-full">
            <AddMemberDialog>
              <Button
                active="scale"
                variant="brand"
                className="md:text-md h-9 whitespace-nowrap px-3.5 text-[0.8125rem] font-medium md:px-4"
                data-testid={constants.ADD_MEMBERS_BUTTON}
              >
                Add member
              </Button>
            </AddMemberDialog>
          </div>
        </div>
        <div className="mt-8">
          <div className="my-2 flex-1 text-sm font-medium lowercase text-foreground">
            {tableCount} {getOptionDisplayName(roleFilter, tableCount)}
          </div>
          <Table>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="grid grid-cols-[7fr_3fr_2fr] items-center gap-x-4"
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <TableCell
                        key={cell.id}
                        className={cn("flex-1 p-0 md:px-px", {
                          "overflow-hidden text-ellipsis": idx === 0,
                        })}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No {getOptionDisplayName(roleFilter, tableCount)}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function getOptionDisplayName(
  name: (typeof MemberRolesOrStateList)[number],
  count: number,
) {
  let displayName: (typeof MemberRolesOrStateList)[number] = name.toLowerCase();
  if (displayName === "all") {
    displayName = "member";
  }
  if (
    displayName === "external" ||
    displayName === "operations" ||
    displayName === "disabled"
  ) {
    displayName = `${displayName} member`;
  }

  if (count > 1 || count === 0) {
    if (displayName.endsWith("s")) {
      return displayName;
    }
    return `${displayName}s`;
  }

  return displayName;
}
