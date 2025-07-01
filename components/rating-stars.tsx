import { Icons } from "./icons";

export default function RatingStars({
  rating,
  onSelect,
}: {
  rating: number;
  onSelect: (rating: number) => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= rating) {
          return (
            <button key={i} onClick={() => onSelect(i)}>
              <Icons.star key={i} className="h-6 w-6 text-muted-yellow xl:h-7 xl:w-7" />
            </button>
          );
        }

        return (
          <button key={i} onClick={() => onSelect(i)}>
            <Icons.starOutline key={i} className="h-6 w-6 text-muted-foreground xl:h-7 xl:w-7" />
          </button>
        );
      })}
    </div>
  );
}
