import { Icons } from "#/components/icons";

export default function DataTableRatingStars({ rating }: { rating: number }) {
  const remainder = rating - Math.floor(rating);
  const rounded = Number(rating).toFixed(1);
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center gap-1">
        {Array.from(Array(5).keys()).map((index) => {
          return (
            <div key={index.toString()} className="relative h-5 w-5 shrink">
              <Icons.starRating className="h-full w-full text-shamiri-light-grey" />
            </div>
          );
        })}
        {!Number.isNaN(rating) && (
          <div className="absolute inset-0 flex items-center gap-1 text-shamiri-light-orange">
            {Array.from(Array(Math.floor(rating)).keys()).map((index) => {
              return <Icons.starRating key={index} className="h-5 w-5" />;
            })}
            {remainder > 0 ? (
              <div className="relative h-5 w-5 shrink">
                <Icons.starRating className="h-full w-full text-transparent" />
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${remainder * 100}%` }}
                >
                  <Icons.starRating className="h-5 w-5" />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <div className="text-shamiri-text-grey">{Number.isNaN(rating) ? "0.0" : rounded}</div>
    </div>
  );
}
