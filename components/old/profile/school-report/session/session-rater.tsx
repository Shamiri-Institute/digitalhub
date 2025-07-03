"use client";

import * as React from "react";

import { rateSession } from "#/app/actions";
import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

type SessionRatings = {
  studentBehavior: number;
  adminSupport: number;
  workload: number;
};

export function SessionRater({
  revalidatePath,
  sessionId,
  supervisorId,
  ratings,
  schoolNotAssigned = false,
}: {
  revalidatePath: string;
  sessionId: string;
  supervisorId: string;
  ratings: SessionRatings;
  schoolNotAssigned?: boolean;
}) {
  const { toast } = useToast();

  const onRatingSelect = React.useCallback(
    async (kind: "student-behavior" | "admin-support" | "workload", rating: number) => {
      const { success } = await rateSession({
        kind,
        rating,
        sessionId,
        supervisorId,
      });

      if (success) {
        toast({
          title: "Rating successfully recorded",
        });
        window.location.href = revalidatePath;
      } else {
        toast({
          variant: "destructive",
          title: "Could not record rating",
        });
      }
    },
    [revalidatePath, sessionId, supervisorId, toast],
  );

  return (
    <div className="mt-4 px-6">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger
            className={"items-right border border-border/50 bg-white px-5"}
            iconClass={"h-7 w-7 mr-3 text-brand"}
          >
            <div className="flex items-center">
              <Icons.starOutline className="mr-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
              <span className="items-center align-middle"> Ratings</span>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <div className={cn("pt-4", schoolNotAssigned && "pointer-events-none")}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-normal text-brand">Student behavior</p>
                <RatingStars
                  onSelect={(rating) => {
                    onRatingSelect("student-behavior", rating);
                  }}
                  rating={ratings.studentBehavior}
                />
              </div>

              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">Admin support</p>
                <RatingStars
                  onSelect={(rating) => {
                    onRatingSelect("admin-support", rating);
                  }}
                  rating={ratings.adminSupport}
                />
              </div>

              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">Workload</p>
                <RatingStars
                  onSelect={(rating) => {
                    onRatingSelect("workload", rating);
                  }}
                  rating={ratings.workload}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="my-2" />
    </div>
  );
}

function RatingStars({ rating, onSelect }: { rating: number; onSelect: (rating: number) => void }) {
  return (
    <div className="flex flex-1 justify-end">
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= rating) {
          return (
            <button type="button" key={i} onClick={() => onSelect(i)}>
              <Icons.star
                key={i}
                className="ml-4 h-6 w-6 align-baseline text-muted-yellow xl:h-7 xl:w-7"
              />
            </button>
          );
        }

        return (
          <button type="button" key={i} onClick={() => onSelect(i)}>
            <Icons.starOutline
              key={i}
              className="ml-4 h-6 w-6 align-baseline text-muted-foreground xl:h-7 xl:w-7"
            />
          </button>
        );
      })}
    </div>
  );
}
