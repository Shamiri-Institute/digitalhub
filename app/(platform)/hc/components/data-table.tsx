"use client";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { cn } from "#/lib/utils";
import {
  ColumnDef,
  OnChangeFn,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Image from "next/image";
import { useEffect, useState } from "react";
import SettingsIcon from "../../../../public/icons/settings-icon.svg";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  editColumns?: boolean;
  className?: string;
  onRowSelectionChange?: (rows: unknown[]) => void;
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  editColumns = true,
  className,
  emptyStateMessage,
  onRowSelectionChange,
}: DataTableProps<TData, TValue> & { emptyStateMessage: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (state) => {
    setRowSelection(state);
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnVisibility, rowSelection },
  });

  useEffect(() => {
    const rows = table.getSelectedRowModel().rows;
    if (onRowSelectionChange) {
      onRowSelectionChange(rows.map((row) => row.original));
    }
  }, [onRowSelectionChange, rowSelection, table]);

  return (
    <div>
      {editColumns && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-white text-sm font-semibold leading-5 text-shamiri-black"
              >
                Edit Columns
                <Image
                  unoptimized
                  priority
                  src={SettingsIcon}
                  alt="Setting Icon"
                  width={24}
                  height={24}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(val) => col.toggleVisibility(!!val)}
                  >
                    {col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <Table className={className}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "rounded bg-background-secondary !px-4 text-sm font-semibold leading-5 text-shamiri-text-grey",
                    ["actions", "select"].includes(
                      //@ts-ignore
                      header.column.columnDef.header,
                    )
                      ? "py-3"
                      : "py-2",
                    header.column.columnDef.id === "button" ||
                      header.column.columnDef.id === "checkbox"
                      ? "action-cell"
                      : null,
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="text-sm font-medium leading-5 text-shamiri-text-dark-grey"
                data-state={row.getIsSelected() && "Selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "border-y border-l",
                      cell.column.columnDef.id === "button" ||
                        cell.column.columnDef.id === "checkbox"
                        ? "relative cursor-pointer border-l-0 !p-0"
                        : "!px-4 py-2",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length}>
                {emptyStateMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
