"use client";

import * as React from "react";
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
import { Icons } from "#/components/icons";
import { UserAvatar } from "#/components/ui/avatar";
import { cn } from "#/lib/utils";
import { AddMemberDialog } from "./add-member-dialog";
import { RoleTypes } from "#/models/role";
import { constants } from "#/tests/constants";

const MemberRolesOrStateList = [
  ...RoleTypes.map((role) => role.name),
  "Pending invite",
  "Disabled",
];

interface Member {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

const data: Member[] = [
  {
    email: "osborn@shamiri.institute",
    name: "Tom Osborn",
    role: "Admin",
    avatarUrl:
      "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    email: "mmbone@shamiri.institute",
    name: "Wendy Mmbone",
    role: "Researcher",
    avatarUrl:
      "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3043&q=80",
  },
  {
    email: "benny@shamiri.institute",
    name: "Benny H. Otieno",
    role: "Admin",
    avatarUrl:
      "https://images.unsplash.com/photo-1596005554384-d293674c91d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=5396&q=80",
  },
  {
    email: "linus@shamiri.institute",
    name: "Linus Wong",
    role: "Admin",
    avatarUrl: null,
  },
  {
    email: "edmund@shamiri.institute",
    name: "Edmund Korley",
    role: "Admin",
    avatarUrl: null,
  },
];

const columns: ColumnDef<Member>[] = [
  {
    id: "display",
    header: "Display",
    accessorFn: (row) => row.name + row.email,
    cell: ({ row }) => {
      const { email, name, avatarUrl } = row.original;
      return (
        <div className="whitespace-nowrap py-5 pr-3 text-sm flex">
          <div className="flex items-center overflow-hidden text-ellipsis">
            <div className="h-[18px] w-[18px] sm:h-11 sm:w-11 flex-shrink-0">
              <UserAvatar
                className="h-[18px] w-[18px] sm:h-11 sm:w-11 text-xs sm:text-"
                src={avatarUrl || ""}
                fallback={name}
                fallbackClasses="text-[8px] sm:text-sm"
              />
            </div>
            <div className="ml-4 md:ml-5 overflow-hidden text-ellipsis">
              <div className="font-medium hidden sm:block">{name}</div>
              <div className="overflow-hidden text-ellipsis sm:mt-1 sm:w-auto font-medium sm:font-normal sm:text-muted-foreground text-xs sm:text-sm">
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
      return <div className="text-primary/80 text-xs sm:text-sm">{role}</div>;
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

export function MembersTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
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
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-base">Manage members</CardTitle>
      </CardHeader>
      <CardContent className="p-0 bg-transparent">
        <div className="mb-4 pt-2 flex items-center gap-4">
          <div className="md:max-w-sm flex w-full relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Icons.search className="h-3 w-3 md:h-4 md:w-4 text-foreground/50" />
            </div>
            <Input
              placeholder="Search by name or email"
              value={
                (table.getColumn("display")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("display")?.setFilterValue(event.target.value)
              }
              className="pl-6 md:pl-8 max-w-sm bg-card text-[0.8125rem] md:text-sm"
            />
            <div className="ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="ml-auto whitespace-nowrap text-[0.8125rem] md:text-sm px-2 py-1.5 md:px-4 md:py-2 font-medium"
                  >
                    {roleFilter}{" "}
                    <ChevronDownIcon className="ml-1 md:ml-2 h-4 w-4" />
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
          <div className="flex md:w-full justify-end">
            <AddMemberDialog>
              <Button
                active="scale"
                variant="brand"
                className="h-9 px-3.5 md:px-4 font-medium whitespace-nowrap text-[0.8125rem] md:text-md"
                data-testid={constants.ADD_MEMBERS_BUTTON}
              >
                Add member
              </Button>
            </AddMemberDialog>
          </div>
        </div>
        <div className="mt-8">
          <div className="my-2 flex-1 font-medium text-sm text-foreground lowercase">
            {tableCount} {getOptionDisplayName(roleFilter, tableCount)}
          </div>
          <Table>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="grid grid-cols-[7fr_3fr_2fr] gap-x-4 items-center"
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <TableCell
                        key={cell.id}
                        className={cn("p-0 flex-1", {
                          "overflow-hidden text-ellipsis": idx === 0,
                        })}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
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
  count: number
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
