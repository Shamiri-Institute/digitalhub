import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function ChartSkeleton() {
  return (
    <Card role="status">
      <CardHeader className="border-b border-dashed px-4 py-[14px] text-lg">
        <CardTitle>
          <div className="h-2.5 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[275px] pt-6">
        <div className="max-w-sm animate-pulse rounded border border-gray-200 p-4 shadow dark:border-gray-700 md:p-6">
          <div className="mt-4 flex items-baseline">
            <div className="h-72 w-full rounded-t-lg bg-gray-200 dark:bg-gray-700" />
            <div className="ms-6 h-56 w-full rounded-t-lg bg-gray-200 dark:bg-gray-700" />
            <div className="ms-6 h-72 w-full rounded-t-lg bg-gray-200 dark:bg-gray-700" />
            <div className="ms-6 h-64 w-full rounded-t-lg bg-gray-200 dark:bg-gray-700" />
            <div className="ms-6 h-80 w-full rounded-t-lg bg-gray-200 dark:bg-gray-700" />
            <div className="ms-6 h-72 w-full rounded-t-lg bg-gray-200 dark:bg-gray-700" />
            <div className="ms-6 h-80 w-full rounded-t-lg bg-gray-200 dark:bg-gray-700" />
          </div>
          <span className="sr-only">Loading...</span>
        </div>
      </CardContent>
    </Card>
  );
}
