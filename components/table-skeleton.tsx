import { ReactNode } from "react";
import { Skeleton } from "./ui/skeleton";

export default function TableSkeleton({ numRows = 1 }: { numRows: number }) {
  const loaders: ReactNode[] = [];

  for (let i = 0; i < numRows; i++) {
    loaders.push(<Skeleton className="h-4 w-full bg-gray-200" />);
  }

  return <div className="space-y-2">{loaders}</div>;
}
