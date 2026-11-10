"use client";

import { format } from "date-fns";
import { useTransition } from "react";
import { type CaseToReview, markClinicalCaseReviewed } from "#/app/(platform)/sc/clinical/action";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { toastOnFailure, useToast } from "#/components/ui/use-toast";
import { DISPLAY_DATE_TIME } from "#/lib/date-utils";

export function CasesToReview({ reviews }: { reviews: CaseToReview[] }) {
  return (
    <section className="w-full space-y-2">
      <h2 className="text-sm font-medium">Cases to review ({reviews.length})</h2>
      {reviews.length > 0 && (
        <ul className="space-y-2">
          {reviews.map((review) => (
            <CaseReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CaseReviewCard({ review }: { review: CaseToReview }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { termination, reopening } = review;
  const reviewedChange = termination
    ? {
        kind: "Terminated",
        clinicalCase: termination.case,
        reason: `${termination.terminationReason}. ${termination.terminationReasonExplanation}`,
        changedBy: termination.user.name,
      }
    : {
        kind: "Reopened",
        clinicalCase: reopening?.case,
        reason: reopening?.reason,
        changedBy: reopening?.user.name,
      };
  const changeDetails = [
    reviewedChange.changedBy && `By ${reviewedChange.changedBy}`,
    format(review.createdAt, DISPLAY_DATE_TIME),
  ].filter(Boolean);

  const markReviewed = () =>
    startTransition(() =>
      toastOnFailure(async () => {
        const response = await markClinicalCaseReviewed(review.id);
        toast(
          response.success
            ? { variant: "default", title: "Case marked reviewed" }
            : { variant: "destructive", title: response.message ?? "Please try again" },
        );
      }),
    );

  return (
    <li>
      <Card className="flex flex-col gap-4 bg-white p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-medium text-primary">
              {reviewedChange.clinicalCase?.pseudonym ?? "Anonymous"}
            </p>
            <Badge variant={reviewedChange.kind === "Terminated" ? "destructive" : "success"}>
              {reviewedChange.kind}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{changeDetails.join(" · ")}</p>
          <p className="text-sm whitespace-pre-line">{reviewedChange.reason}</p>
        </div>
        <Button disabled={isPending} onClick={markReviewed} className="shrink-0">
          Mark reviewed
        </Button>
      </Card>
    </li>
  );
}
