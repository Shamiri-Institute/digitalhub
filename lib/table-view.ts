import type { PaginationState } from "@tanstack/react-table";

/** The page sizes a table offers; a size in the URL must be one of them. */
export const PAGE_SIZES = [5, 10, 20, 30, 40, 50];
export const DEFAULT_PAGE_SIZE = 10;

export type TableViewParams = { page: string; size: string };

const PAGE_NUMBER = /^[1-9]\d*$/;

/** A page with two URL-bound tables gives each a prefix: `?myCases.page=2`. */
export function tableViewParams(prefix?: string): TableViewParams {
  return prefix
    ? { page: `${prefix}.page`, size: `${prefix}.size` }
    : { page: "page", size: "size" };
}

/** A list table's page and page size as the URL holds them: `?page=2&size=20`. */
export function parseTableView(
  get: (name: string) => string | null,
  params: TableViewParams,
  rowCount: number,
): PaginationState {
  const sizeParam = get(params.size);
  const pageSize = PAGE_SIZES.find((size) => String(size) === sizeParam) ?? DEFAULT_PAGE_SIZE;
  const lastPageIndex = Math.max(Math.ceil(rowCount / pageSize) - 1, 0);
  const pageNumber = get(params.page);
  const pageIndex =
    pageNumber && PAGE_NUMBER.test(pageNumber)
      ? Math.min(Number(pageNumber) - 1, lastPageIndex)
      : 0;
  return { pageIndex, pageSize };
}

/** `search` with the table's page and size written in, leaving the page's other params alone. */
export function tableViewSearch(
  search: string,
  params: TableViewParams,
  { pageIndex, pageSize }: PaginationState,
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
  const query = searchParams.toString();
  return query ? `?${query}` : "";
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
