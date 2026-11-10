import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="border-b border-dashed px-4 py-[14px] text-lg">
        <CardTitle>
          <div className="h-2.5 w-32 rounded-full bg-muted" />
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[275px] pt-6">
        <div className="max-w-sm animate-pulse rounded border border-border p-4 shadow-sm md:p-6">
          <div className="mt-4 flex items-baseline">
            <div className="h-[80%] w-full rounded-t-lg bg-muted" />
            <div className="ms-6 h-20 w-full rounded-t-lg bg-muted" />
            <div className="ms-6 h-12 w-full rounded-t-lg bg-muted" />
            <div className="h-30 ms-6 w-full rounded-t-lg bg-muted" />
            <div className="ms-6 h-40 w-full rounded-t-lg bg-muted" />
            <div className="ms-6 h-32 w-full rounded-t-lg bg-muted" />
            <div className="ms-6 h-20 w-full rounded-t-lg bg-muted" />
          </div>
          <span className="sr-only">Loading...</span>
        </div>
      </CardContent>
    </Card>
  );
}
