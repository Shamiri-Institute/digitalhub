import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";

type SessionRatings = {
  studentBehavior: number;
  adminSupport: number;
  workload: number;
};

export function SessionRater({ ratings }: { ratings: SessionRatings }) {
  return (
    <div className="mt-4 px-6">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger
            className={"items-right border border-border/50 bg-white px-5"}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.startOutline className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle"> Ratings</span>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <div className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-normal text-brand">
                  Student behavior
                </p>
                <RatingStars rating={ratings.studentBehavior} />
              </div>

              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">Admin support</p>
                <RatingStars rating={ratings.adminSupport} />
              </div>

              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">Workload</p>
                <RatingStars rating={ratings.workload} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="my-2" />
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  if (rating > 5) {
    console.error("Rating cannot be greater than 5");
  }

  return (
    <div className="flex flex-1 justify-end">
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= rating) {
          return (
            <Icons.star
              key={i}
              className="ml-4 h-6 w-6 align-baseline text-muted-yellow xl:h-7 xl:w-7"
            />
          );
        }

        return (
          <Icons.startOutline
            key={i}
            className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7"
          />
        );
      })}
    </div>
  );
}
