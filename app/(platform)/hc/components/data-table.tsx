"use client";
import { Icons } from "#/components/icons";
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
  Row,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  editColumns?: boolean;
  className?: string;
  onRowSelectionChange?: (rows: unknown[]) => void;
  columnVisibilityState?: VisibilityState;
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean) | undefined;
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  editColumns = true,
  className,
  emptyStateMessage,
  onRowSelectionChange,
  columnVisibilityState = {},
  enableRowSelection,
}: DataTableProps<TData, TValue> & { emptyStateMessage: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    columnVisibilityState,
  );
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
    onRowSelectionChange: handleRowSelectionChange,
    enableRowSelection,
    state: { sorting, columnVisibility, rowSelection },
  });

  useEffect(() => {
    const rows = table.getSelectedRowModel().rows;
    if (onRowSelectionChange) {
      onRowSelectionChange(rows.map((row) => row.original));
    }
  }, [onRowSelectionChange, rowSelection, table]);

  useEffect(() => {
    table.resetRowSelection();
  }, [data, table]);

  return (
    <div>
      {editColumns && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold leading-5 text-shamiri-black hover:bg-background-secondary hover:shadow-inner">
                Edit Columns
                <Icons.settings className="h-4 w-4 text-shamiri-text-dark-grey" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={"end"}>
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(val) => col.toggleVisibility(!!val)}
                    onSelect={(e) => {
                      e.preventDefault();
                    }}
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
            <TableRow key={headerGroup.id} id={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  id={header.id}
                  className={cn(
                    "rounded bg-background-secondary/50 !px-4 text-sm font-semibold leading-5 text-shamiri-text-grey",
                    header.column.columnDef.id !== "checkbox" && "truncate",
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
                id={row.id}
                className="text-sm font-medium leading-5 text-shamiri-text-dark-grey data-[state=Selected]:bg-blue-bg"
                data-state={row.getIsSelected() && "Selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    id={cell.id}
                    className={cn(
                      "truncate border-y border-l",
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
