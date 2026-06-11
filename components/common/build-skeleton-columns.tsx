import type { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "#/components/ui/skeleton";

export function buildSkeletonColumns<TData>(columns: ColumnDef<TData>[]): ColumnDef<TData>[] {
  return columns.map((column) => {
    const id = (column.id ?? column.header) as string;
    const renderSkeleton = id !== "checkbox" && id !== "button";
    return {
      id,
      header: renderSkeleton ? id : "",
      cell: () => (renderSkeleton ? <Skeleton className="h-5 w-full bg-gray-200" /> : null),
    } as ColumnDef<TData>;
  });
}

export function buildSkeletonRows<TData>(rows = 10): TData[] {
  return Array.from({ length: rows }, () => ({}) as TData);
}
