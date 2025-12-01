import { Icons } from "#/components/icons";
import { FormMessage } from "#/components/ui/form";
import { cn } from "#/lib/utils";

export default function RatingStarsInput({
  value,
  onChange,
  disabled = false,
}: {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4",
        disabled ? "pointer-events-none" : "pointer-events-auto",
      )}
    >
      <div className="rating-stars flex flex-row-reverse gap-1 py-2">
        {Array.from(Array(5).keys()).map((index) => {
          return (
            <button
              type="button"
              key={index.toString()}
              className={cn(
                "peer relative h-5 w-5 shrink cursor-pointer transition ease-in hover:text-shamiri-light-orange active:scale-[1.25] peer-hover:text-shamiri-light-orange",
                value && value >= 5 - index
                  ? "text-shamiri-light-orange"
                  : "text-shamiri-light-grey",
              )}
              onClick={() => {
                onChange(5 - index);
              }}
            >
              <Icons.starRating className="h-full w-full" />
            </button>
          );
        })}
      </div>
      <FormMessage />
    </div>
  );
}
