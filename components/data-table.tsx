"use client";
import { rankItem } from "@tanstack/match-sorter-utils";
import {
  type ColumnDef,
  type FilterFn,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useSearchParams } from "next/navigation";
import { Fragment, type ReactNode, startTransition, useState } from "react";
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
import {
  parseTableView,
  type TableView,
  type TableViewParams,
  tableViewParams,
  tableViewSearch,
} from "#/lib/table-view";
import { cn } from "#/lib/utils";

// oxlint-disable-next-line typescript/no-explicit-any -- FilterFn generic requires any for universal compatibility with all table data types
const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue<string>(columnId), String(value));
  addMeta({ itemRank });
  return itemRank.passed;
};

type RowSelectionProps<TData> =
  | {
      getRowId: (row: TData) => string;
      rowSelection: RowSelectionState;
      onRowSelectionChange: (rowSelection: RowSelectionState) => void;
    }
  | {
      getRowId?: (row: TData) => string;
      rowSelection?: undefined;
      onRowSelectionChange?: undefined;
    };

type DataTableProps<TData, TValue> = RowSelectionProps<TData> & {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  editColumns?: boolean;
  disableSearch?: boolean;
  disablePagination?: boolean;
  isSubComponent?: boolean;
  className?: string;
  rowSelectionDescription?: string;
  columnVisibilityState?: VisibilityState;
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean) | undefined;
  renderTableActions?: ReactNode;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  renderSubComponent?: (props: { row: Row<TData> }) => ReactNode;
  /**
   * Keeps the page and sort in the URL, so a reload, back/forward or a shared link opens the same
   * page. Only for a page's main list table, with a prefix when the page has two. Search text never
   * goes in the URL: it matches students' names and clinical data.
   */
  urlState?: boolean | { prefix: string };
};

type UrlView = { params: TableViewParams; get: (name: string) => string | null };

export default function DataTable<TData, TValue>(
  props: DataTableProps<TData, TValue> & { emptyStateMessage: string },
) {
  return props.urlState ? (
    <UrlStateDataTable {...props} />
  ) : (
    <DataTableContent {...props} urlView={null} />
  );
}

// Only URL-bound tables read the search params, so the tables in dialogs don't re-render when the
// URL changes.
function UrlStateDataTable<TData, TValue>(
  props: DataTableProps<TData, TValue> & { emptyStateMessage: string },
) {
  const searchParams = useSearchParams();
  const prefix = typeof props.urlState === "object" ? props.urlState.prefix : undefined;
  return (
    <DataTableContent
      {...props}
      urlView={{ params: tableViewParams(prefix), get: (name) => searchParams.get(name) }}
    />
  );
}

function DataTableContent<TData, TValue>({
  columns,
  data,
  editColumns = true,
  disableSearch = false,
  disablePagination = false,
  isSubComponent = false,
  className,
  emptyStateMessage,
  getRowId,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  columnVisibilityState = {},
  enableRowSelection,
  renderTableActions,
  rowSelectionDescription = "rows",
  getRowCanExpand = () => true,
  renderSubComponent,
  urlView,
}: DataTableProps<TData, TValue> & { emptyStateMessage: string; urlView: UrlView | null }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(columnVisibilityState);
  const [uncontrolledRowSelection, setUncontrolledRowSelection] = useState<RowSelectionState>({});
  const rowSelection = controlledRowSelection ?? uncontrolledRowSelection;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [typedPageNumber, setTypedPageNumber] = useState<string | null>(null);

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    const nextRowSelection = functionalUpdate(updater, rowSelection);
    if (onRowSelectionChange) {
      onRowSelectionChange(nextRowSelection);
    } else {
      setUncontrolledRowSelection(nextRowSelection);
    }
  };

  // The data is already here, so a URL-bound table replaces the URL without asking the server for
  // the page again. The router hands the new params back through useSearchParams.
  const replaceUrlView = (params: TableViewParams, change: Partial<TableView>) => {
    const { sorting: shownSorting, pagination: shownPagination } = table.getState();
    const search = tableViewSearch(window.location.search, params, {
      pageIndex: shownPagination.pageIndex,
      sorting: shownSorting,
      ...change,
    });
    if (search !== window.location.search) {
      window.history.replaceState(null, "", `${window.location.pathname}${search}`);
    }
  };

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getRowCanExpand,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: urlView
      ? (updater) =>
          replaceUrlView(urlView.params, {
            sorting: functionalUpdate(updater, table.getState().sorting),
          })
      : setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: disablePagination ? undefined : getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
    onPaginationChange: urlView
      ? (updater) => {
          const nextPagination = functionalUpdate(updater, table.getState().pagination);
          // The page size stays component state. The router applies the URL's page in a
          // transition, so the size goes in one too and both show in the same render.
          startTransition(() => setPagination(nextPagination));
          replaceUrlView(urlView.params, { pageIndex: nextPagination.pageIndex });
        }
      : setPagination,
    enableRowSelection,
    state: { sorting, columnVisibility, rowSelection, pagination },
    autoResetPageIndex: false,
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: fuzzyFilter,
  });

  // Read from the filtered rows: sorting doesn't change the count, and a URL-bound table's sort is
  // not applied yet.
  const pageCount = Math.ceil(table.getFilteredRowModel().rows.length / pagination.pageSize);
  const lastPageIndex = Math.max(pageCount - 1, 0);
  if (urlView) {
    // Only the built table knows which columns can sort and how many pages the data and search
    // fill, so the URL's view is checked against them and applied to the table here. Nothing is
    // written back: a page past the end shows the last page and stays in the URL until the next
    // page change, so the clamp cannot loop with the URL.
    const urlTableView = parseTableView(urlView.get, urlView.params, {
      lastPageIndex,
      sortableColumnIds: table
        .getAllLeafColumns()
        .filter((column) => column.getCanSort())
        .map((column) => column.id),
    });
    table.setOptions((options) => ({
      ...options,
      state: {
        ...options.state,
        sorting: urlTableView.sorting,
        pagination: { ...pagination, pageIndex: urlTableView.pageIndex },
      },
    }));
  } else if (pagination.pageIndex > lastPageIndex) {
    // A refresh can leave fewer pages than the current one. Setting state during render makes React
    // render again with the last page before it paints an empty one.
    setPagination({ ...pagination, pageIndex: lastPageIndex });
  }

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
                onChange={(e) => {
                  table.setGlobalFilter(String(e.target.value));
                  table.firstPage();
                }}
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
                      "py-2",
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
                  aria-label="Page number"
                  type="number"
                  min="1"
                  max={table.getPageCount()}
                  value={typedPageNumber ?? table.getState().pagination.pageIndex + 1}
                  onChange={(e) => {
                    setTypedPageNumber(e.target.value);
                    const pageNumber = Number(e.target.value);
                    if (
                      Number.isInteger(pageNumber) &&
                      pageNumber >= 1 &&
                      pageNumber <= table.getPageCount()
                    ) {
                      table.setPageIndex(pageNumber - 1);
                    }
                  }}
                  onBlur={() => setTypedPageNumber(null)}
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
