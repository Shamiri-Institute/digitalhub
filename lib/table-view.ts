import type { SortingState } from "@tanstack/react-table";

/** A list table's page and sort as the URL holds them: `?page=2&sort=Student+Name.desc`. */
export type TableView = { pageIndex: number; sorting: SortingState };

export type TableViewParams = { page: string; sort: string };

const PAGE_NUMBER = /^[1-9]\d*$/;

/** A page with two URL-bound tables gives each a prefix: `?myCases.page=2`. */
export function tableViewParams(prefix?: string): TableViewParams {
  return prefix
    ? { page: `${prefix}.page`, sort: `${prefix}.sort` }
    : { page: "page", sort: "sort" };
}

export function parseTableView(
  get: (name: string) => string | null,
  params: TableViewParams,
  table: { lastPageIndex: number; sortableColumnIds: readonly string[] },
): TableView {
  const pageNumber = get(params.page);
  const pageIndex =
    pageNumber && PAGE_NUMBER.test(pageNumber)
      ? Math.min(Number(pageNumber) - 1, table.lastPageIndex)
      : 0;
  return { pageIndex, sorting: parseSorting(get(params.sort), table.sortableColumnIds) };
}

function parseSorting(sort: string | null, sortableColumnIds: readonly string[]): SortingState {
  return (sort ?? "").split(",").flatMap((columnSort) => {
    // Column ids can contain dots ("Contact no."), so the direction is what follows the last one.
    const separator = columnSort.lastIndexOf(".");
    const columnId = columnSort.slice(0, separator);
    const direction = columnSort.slice(separator + 1);
    return separator > 0 &&
      sortableColumnIds.includes(columnId) &&
      (direction === "asc" || direction === "desc")
      ? [{ id: columnId, desc: direction === "desc" }]
      : [];
  });
}

/** `search` with the table's view written in, leaving the page's other params as they are. */
export function tableViewSearch(search: string, params: TableViewParams, view: TableView) {
  const searchParams = new URLSearchParams(search);
  if (view.pageIndex > 0) {
    searchParams.set(params.page, String(view.pageIndex + 1));
  } else {
    searchParams.delete(params.page);
  }
  const sort = view.sorting.map(({ id, desc }) => `${id}.${desc ? "desc" : "asc"}`).join(",");
  if (sort) {
    searchParams.set(params.sort, sort);
  } else {
    searchParams.delete(params.sort);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}
