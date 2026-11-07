import { Card } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";

export default function ReferredCasesLoader() {
  return (
    <div className="w-full">
      <Skeleton className="mb-2 h-5 w-48 bg-shamiri-light-grey" />
      {[1, 2].map((i) => (
        <Card key={i} className="my-2 flex items-center justify-between gap-5 bg-white p-4 pr-3.5">
          <Skeleton className="h-5 w-24 bg-shamiri-light-grey" />
          <Skeleton className="h-5 w-64 bg-shamiri-light-grey" />
          <div className="flex items-center justify-between">
            <Skeleton className="mx-2 h-6 w-6 rounded-full bg-shamiri-light-grey" />
            <Skeleton className="mx-2 h-6 w-6 rounded-full bg-shamiri-light-grey" />
          </div>
        </Card>
      ))}
    </div>
  );
}
