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
