"use client";
import { rankItem } from "@tanstack/match-sorter-utils";
import {
  type ColumnDef,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { cn } from "#/lib/utils";

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value);
  // Store the itemRank info
  addMeta({ itemRank });
  // Return if the item should be filtered in/out
  return itemRank.passed;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  editColumns?: boolean;
  disableSearch?: boolean;
  disablePagination?: boolean;
  isSubComponent?: boolean;
  className?: string;
  onRowSelectionChange?: (rows: Row<TData>[]) => void;
  rowSelectionDescription?: string;
  columnVisibilityState?: VisibilityState;
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean) | undefined;
  renderTableActions?: ReactNode;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  renderSubComponent?: (props: { row: Row<TData> }) => ReactNode;
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  editColumns = true,
  disableSearch = false,
  disablePagination = false,
  isSubComponent = false,
  className,
  emptyStateMessage,
  onRowSelectionChange,
  columnVisibilityState = {},
  enableRowSelection,
  renderTableActions,
  rowSelectionDescription = "rows",
  getRowCanExpand = () => true,
  renderSubComponent,
}: DataTableProps<TData, TValue> & { emptyStateMessage: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(columnVisibilityState);
  const [rowSelection, setRowSelection] = useState({});

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (state) => {
    setRowSelection(state);
  };

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,
    getRowCanExpand,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
    onPaginationChange: setPagination,
    enableRowSelection,
    state: { sorting, columnVisibility, rowSelection, pagination },
    autoResetPageIndex: true, //turns off auto reset of pageIndex
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: fuzzyFilter,
  });

  useEffect(() => {
    const rows = table.getSelectedRowModel().rows;
    if (onRowSelectionChange) {
      onRowSelectionChange(rows);
    }
  }, [onRowSelectionChange, rowSelection, table]);

  useEffect(() => {
    table.resetRowSelection();
  }, [data, table]);

  return (
    <div className="no-scrollbar overflow-hidden">
      <div
        className={cn(
          "flex flex-col-reverse p-1 lg:flex-row lg:items-end lg:justify-between",
          isSubComponent ? "bg-background-secondary/50 p-2 shadow-inner" : "",
        )}
      >
        <div className="shrink-0">
          {table.getSelectedRowModel().rows.length > 0 && (
            <div className="flex w-full items-center justify-between gap-4 lg:w-auto">
              <span className="text-sm">
                {table.getSelectedRowModel().rows.length} {rowSelectionDescription} selected
              </span>
              <Button
                variant="ghost"
                onClick={() => {
                  table.resetRowSelection();
                }}
              >
                Clear selection
              </Button>
            </div>
          )}
        </div>
        <div className="lg:min-w-2/3 flex flex-wrap items-center justify-end gap-3 py-2 lg:flex-wrap-reverse lg:py-0">
          {!disableSearch && (
            <div className="relative mr-1 lg:mr-0">
              <Icons.search
                className="absolute inset-y-0 left-3 my-auto h-4 w-4 text-muted-foreground"
                strokeWidth={1.75}
              />
              <Input
                onChange={(e) => table.setGlobalFilter(String(e.target.value))}
                placeholder="Search..."
                className="w-64 bg-white pl-10"
              />
            </div>
          )}
          {renderTableActions}
          {editColumns && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-1 bg-white">
                  <Icons.settings className="h-4 w-4 text-shamiri-text-grey" />
                  <span>Edit columns</span>
                </Button>
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
          )}
        </div>
      </div>
      <div
        className={cn(
          "",
          !isSubComponent
            ? "no-scrollbar relative mt-4 overflow-hidden rounded-lg border lg:mt-0 lg:border-none"
            : "",
        )}
      >
        {!isSubComponent ? (
          <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-lg shadow-inner-2 lg:hidden" />
        ) : null}
        <Table
          className={cn(
            !isSubComponent
              ? "rounded-lg lg:border lg:border-solid"
              : "lg:border-x-none rounded-none lg:border-none",
            "overflow-x-scroll",
            className,
          )}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} id={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    id={header.id}
                    className={cn(
                      "min-w-[80px] bg-background-secondary/50 px-4! text-sm font-semibold leading-5 text-shamiri-text-grey lg:w-full",
                      header.column.columnDef.id !== "checkbox" && "truncate",
                      ["actions", "select"].includes(
                        //@ts-ignore
                        header.column.columnDef.header,
                      )
                        ? "py-3"
                        : "py-2",
                      header.column.columnDef.id === "button" ||
                        header.column.columnDef.id === "checkbox" ||
                        header.column.columnDef.id === "expand"
                        ? "action-cell"
                        : null,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    id={row.id}
                    className={cn(
                      "text-sm font-medium leading-5 text-shamiri-text-dark-grey transition ease-in-out hover:bg-shamiri-new-blue/5 data-[state=Selected]:bg-shamiri-new-blue/5",
                      isSubComponent ? "bg-background-secondary/50" : "",
                    )}
                    data-state={row.getIsSelected() && "Selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        id={cell.id}
                        className={cn(
                          "truncate border-y border-l first:border-l-0",
                          cell.column.columnDef.id === "button" ||
                            cell.column.columnDef.id === "checkbox" ||
                            cell.column.columnDef.id === "expand"
                            ? "relative cursor-pointer border-l-0 p-0!"
                            : "px-4! py-2",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && renderSubComponent ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-0">
                        {renderSubComponent({ row })}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-shamiri-text-dark-grey"
                >
                  {emptyStateMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!disablePagination && (
        <div className="flex flex-col gap-4 py-3 px-0.5 lg:flex-row lg:items-center lg:justify-between lg:gap-2">
          <div className="flex flex-col items-center gap-2 lg:flex-row">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="pagination"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <Icons.chevronLeft className="h-5 w-5" />
              </button>
              {table.getState().pagination.pageIndex > 0 ? (
                <button
                  type="button"
                  className="pagination"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span>{table.getState().pagination.pageIndex}</span>
                </button>
              ) : null}
              <button
                type="button"
                className="pagination bg-shamiri-new-blue text-white"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span>{table.getState().pagination.pageIndex + 1}</span>
              </button>
              {table.getState().pagination.pageIndex + 2 <= table.getPageCount() ? (
                <button
                  type="button"
                  className="pagination"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span>{table.getState().pagination.pageIndex + 2}</span>
                </button>
              ) : null}
              <button
                type="button"
                className="pagination"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
              >
                <Icons.chevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-sm text-shamiri-text-dark-grey">
                <div>Page</div>
                <strong>
                  {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount().toLocaleString()}
                </strong>
              </span>
              <span className="flex items-center gap-1 pl-4 text-sm text-shamiri-text-dark-grey">
                Go to page:
                <input
                  type="number"
                  min="1"
                  max={table.getPageCount()}
                  defaultValue={table.getState().pagination.pageIndex + 1}
                  onChange={(e) => {
                    const page = e.target.value ? Number(e.target.value) - 1 : 0;
                    table.setPageIndex(page);
                  }}
                  className="w-16 rounded border p-1"
                />
              </span>
            </div>
          </div>
          <div className="flex">
            <div className="flex w-32 items-center gap-2 lg:w-auto">
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger className="text-sm bg-white">
                  <SelectValue placeholder="Pick rows" />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={pageSize.toString()}>
                      Show {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
