import { Skeleton } from "#/components/ui/skeleton";

/**
 * A data table's outline while its page loads: its toolbar, column headings and rows of bars. It
 * is plain HTML, so a loading screen does not download the table and its column code a second time.
 */
export default function TableSkeleton({
  columnNames,
  rows = 10,
}: {
  columnNames: string[];
  rows?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div className="flex gap-4 bg-muted px-4 py-3 text-xs font-semibold text-muted-foreground">
          {columnNames.map((name) => (
            <span key={name} className="min-w-0 flex-1 truncate">
              {name}
            </span>
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex gap-4 border-t px-4 py-3.5">
            {columnNames.map((name) => (
              <Skeleton key={name} className="h-5 min-w-0 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
