import { Loader2 } from "lucide-react";

export default function CountWidget({
  stats,
  loading,
}: {
  stats: {
    title: string;
    count: number;
  }[];
  loading?: boolean;
}) {
  return (
    <div className="relative flex items-center divide-x divide-border rounded-lg border border-border bg-muted font-normal">
      {stats.map((stat) => {
        return (
          <div
            key={stat.title}
            className="flex flex-1 flex-col items-center justify-center px-4 py-2"
          >
            <div className="text-sm text-muted-foreground">{stat.title}</div>
            <div className="flex min-h-7 items-center text-xl">
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                Number(stat.count).toLocaleString()
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
