import { Skeleton } from "#/components/ui/skeleton";

export default function ClinicalStatsLoader() {
  return (
    <div className="flex w-full flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-shamiri-light-grey" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="h-4 w-px bg-shamiri-light-grey" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-shamiri-light-grey" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="h-4 w-px bg-shamiri-light-grey" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-shamiri-light-grey" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-shamiri-light-grey" />
    </div>
  );
}
