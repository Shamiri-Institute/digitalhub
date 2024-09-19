// Loading animation
const shimmer =
  "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent";

export default function GraphLoadingIndicator() {
  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      className={`${shimmer} relative overflow-hidden rounded-xl bg-gray-100 p-2 shadow-sm`}
    >
      <div className="flex p-4">
        <div className="ml-2 h-4 w-32 rounded-md bg-gray-200 text-sm font-medium" />
      </div>
      <div className="flex items-center justify-center">
        <div className="h-64 w-64 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}
