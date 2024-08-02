"use client";

import { Prisma } from "@prisma/client";

import { rateGroup } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { useToast } from "#/components/ui/use-toast";

import { Icons } from "#/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";
import React from "react";

export function GroupEngagementRater({
  revalidatePath: path,
  groupName,
  ratings,
  id: evaluationId,
  sessionId,
}: {
  revalidatePath: string;
  groupName: string;
  sessionId?: string;
  ratings: Prisma.InterventionGroupReportGetPayload<{}> | null;
  id: string | undefined;
}) {
  const { toast } = useToast();

  const onRatingSelect = React.useCallback(
    async (
      key: "engagement1" | "engagement2" | "engagement3" | "engagementComment",
      rating: number | string,
    ) => {
      const { success } = await rateGroup({
        rating,
        groupId: groupName,
        key,
        id: evaluationId,
        path,
        isAllSessionsEvaluation: true,
        sessionId,
      });

      if (success) {
        toast({
          title: "Rating successfully recorded",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Could not record rating",
        });
      }
    },
    [evaluationId, groupName, path, toast],
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
              <span className="items-center align-middle">
                Group Engagement & Participation
              </span>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <div className="pt-4">
              <p className="mb-3 text-sm font-normal text-brand">
                On a scale of 1-5, where 1 means none of them and 5 means all of
                them, please rate the proportion of students who:
              </p>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">
                  Expressed themselves openly during group discussions
                </p>
                <RatingStars
                  onSelect={(rating) => {
                    onRatingSelect("engagement1", rating);
                  }}
                  rating={ratings?.engagement1 ?? 0}
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">
                  Showed noticeable effort in completing assignments
                </p>
                <RatingStars
                  onSelect={(rating) => {
                    onRatingSelect("engagement2", rating);
                  }}
                  rating={ratings?.engagement2 ?? 0}
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm font-normal text-brand">
                  Collaborated effectively with their peers
                </p>
                <RatingStars
                  onSelect={(rating) => {
                    onRatingSelect("engagement3", rating);
                  }}
                  rating={ratings?.engagement3 ?? 0}
                />
              </div>
              <WrittenEvaluation
                onRatingSelect={onRatingSelect}
                ratings={ratings}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="my-2" />
    </div>
  );
}

function WrittenEvaluation({
  onRatingSelect,
  ratings,
}: {
  ratings: Prisma.InterventionGroupReportGetPayload<{}> | null;
  onRatingSelect: (
    key: "engagement1" | "engagement2" | "engagement3" | "engagementComment",
    rating: number | string,
  ) => Promise<void>;
}) {
  const [comments, setComments] = React.useState<string>(
    ratings?.engagementComment || "",
  );

  const handlSubmitComments = () => {
    onRatingSelect("engagementComment", comments);
  };

  return (
    <div className="px-1">
      <div className="mt-6 grid w-full gap-1.5">
        <Label htmlFor="comments">
          Comments on student group engagement and participation during all
          sessions.
        </Label>
        <Textarea
          id="comments"
          name="comments"
          onChange={(e) => {
            setComments(e.target.value);
          }}
          value={comments}
          placeholder="Write here..."
          className="mt-1.5 resize-none bg-card"
          rows={10}
        />
      </div>

      <Button
        type="submit"
        onClick={handlSubmitComments}
        className="mt-6 w-full bg-shamiri-blue hover:bg-brand"
        disabled={
          comments.length === 0 || comments === ratings?.engagementComment
        }
      >
        Save Evaluation
      </Button>
    </div>
  );
}

function RatingStars({
  rating,
  onSelect,
}: {
  rating: number;
  onSelect: (rating: number) => void;
}) {
  return (
    <div className="flex flex-1 justify-end">
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= rating) {
          return (
            <button key={i} onClick={() => onSelect(i)}>
              <Icons.star
                key={i}
                className="ml-4 h-6 w-6 align-baseline text-muted-yellow xl:h-7 xl:w-7"
              />
            </button>
          );
        }

        return (
          <button key={i} onClick={() => onSelect(i)}>
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
