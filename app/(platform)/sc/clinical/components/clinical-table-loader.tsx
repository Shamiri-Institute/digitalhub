import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";

export default function ClinicalTableLoader() {
  return (
    <Card className="w-full lg:mt-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <Skeleton className="h-8 w-48 bg-gray-200" />
        <Skeleton className="h-10 w-28 bg-gray-200" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 border-b pb-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-4 w-24 bg-gray-200" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <Skeleton key={j} className="h-5 w-24 bg-gray-200" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
