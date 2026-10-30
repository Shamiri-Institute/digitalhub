import type { PaginationState, SortingFn, SortingState } from "@tanstack/react-table";

/** The page sizes a table offers; a size in the URL must be one of them. */
export const PAGE_SIZES = [5, 10, 20, 30, 40, 50];
export const DEFAULT_PAGE_SIZE = 10;

export type TableViewParams = { page: string; size: string; sort: string };

/** What a URL-bound table shows: its page, page size and sort. */
export type TableView = { pagination: PaginationState; sorting: SortingState };

const PAGE_NUMBER = /^[1-9]\d*$/;
const COLUMN_SORT = /^(.+)\.(asc|desc)$/;

/** A page with two URL-bound tables gives each a prefix: `?myCases.page=2`. */
export function tableViewParams(prefix?: string): TableViewParams {
  return prefix
    ? { page: `${prefix}.page`, size: `${prefix}.size`, sort: `${prefix}.sort` }
    : { page: "page", size: "size", sort: "sort" };
}

/**
 * A list table's view as the URL holds it: `?page=2&size=20&sort=Date added.desc`. Column ids can
 * contain dots (`Contact no.`), so the direction follows the last one. A sort on a column the
 * table cannot sort by is ignored.
 */
export function parseTableView(
  get: (name: string) => string | null,
  params: TableViewParams,
  rowCount: number,
  sortableColumnIds: readonly string[],
): TableView {
  const sizeParam = get(params.size);
  const pageSize = PAGE_SIZES.find((size) => String(size) === sizeParam) ?? DEFAULT_PAGE_SIZE;
  const lastPageIndex = Math.max(Math.ceil(rowCount / pageSize) - 1, 0);
  const pageNumber = get(params.page);
  const pageIndex =
    pageNumber && PAGE_NUMBER.test(pageNumber)
      ? Math.min(Number(pageNumber) - 1, lastPageIndex)
      : 0;

  const [, sortColumnId = "", sortDirection] = COLUMN_SORT.exec(get(params.sort) ?? "") ?? [];
  const sorting = sortableColumnIds.includes(sortColumnId)
    ? [{ id: sortColumnId, desc: sortDirection === "desc" }]
    : [];

  return { pagination: { pageIndex, pageSize }, sorting };
}

/** `search` with the table's view written in, leaving the page's other params alone. */
export function tableViewSearch(
  search: string,
  params: TableViewParams,
  { pagination: { pageIndex, pageSize }, sorting: [sort] }: TableView,
) {
  const searchParams = new URLSearchParams(search);
  if (pageIndex > 0) {
    searchParams.set(params.page, String(pageIndex + 1));
  } else {
    searchParams.delete(params.page);
  }
  if (pageSize !== DEFAULT_PAGE_SIZE) {
    searchParams.set(params.size, String(pageSize));
  } else {
    searchParams.delete(params.size);
  }
  if (sort) {
    searchParams.set(params.sort, `${sort.id}.${sort.desc ? "desc" : "asc"}`);
  } else {
    searchParams.delete(params.sort);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

const naturalOrder = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

const isEmptyCellValue = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === "" ||
  Number.isNaN(value instanceof Date ? value.getTime() : value);

/**
 * The order of two cell values: dates by time, numbers by size, and anything else as text in
 * natural order ("Group 2" before "Group 10", "9 yrs" before "15 yrs") whatever its case. Empty
 * values come after the rest.
 */
export function compareCellValues(a: unknown, b: unknown): number {
  const aIsEmpty = isEmptyCellValue(a);
  const bIsEmpty = isEmptyCellValue(b);
  if (aIsEmpty || bIsEmpty) {
    return Number(aIsEmpty) - Number(bIsEmpty);
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return naturalOrder.compare(String(a), String(b));
}

/** Sorts a column by `valueOf` its row, for a column whose cells hold formatted text. */
export function sortBy<TData>(valueOf: (row: TData) => unknown): SortingFn<TData> {
  return (rowA, rowB) => compareCellValues(valueOf(rowA.original), valueOf(rowB.original));
}

function ownRowId(row: unknown) {
  if (typeof row !== "object" || row === null || !("id" in row)) return null;
  const { id } = row;
  if (typeof id === "string" && id !== "") return id;
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return null;
}

/**
 * Row ids for a table that names none. Each row is keyed by its own `id`, so selection, expansion
 * and React keys stay with the row when a refresh reorders the data. A row whose `id` is missing,
 * or shared with another row, is keyed by its index as `index:<n>`, which no database id looks like.
 */
export function rowIdsFromOwnIds<TData>(data: readonly TData[]) {
  // TanStack asks for the ids only when the data changes, so the rows are counted then.
  let rowCountByOwnId: Map<string, number> | undefined;
  const countRowsByOwnId = () => {
    const counts = new Map<string, number>();
    for (const dataRow of data) {
      const dataRowId = ownRowId(dataRow);
      if (dataRowId !== null) counts.set(dataRowId, (counts.get(dataRowId) ?? 0) + 1);
    }
    return counts;
  };
  return (row: TData, index: number) => {
    rowCountByOwnId ??= countRowsByOwnId();
    const rowId = ownRowId(row);
    return rowId !== null && rowCountByOwnId.get(rowId) === 1 ? rowId : `index:${index}`;
  };
}
