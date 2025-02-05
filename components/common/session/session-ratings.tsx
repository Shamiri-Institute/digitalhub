"use client";

import CountdownTimer from "#/app/(platform)/hc/components/countdown-timer";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import RatingStarsInput from "#/components/common/rating-stars-input";
import { SessionRatingsSchema } from "#/components/common/session/schema";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { addDays, addHours, differenceInSeconds, format } from "date-fns";
import { usePathname } from "next/navigation";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormInput = {
  section: string;
  description?: string;
  fields: {
    label?: string;
    name: string;
  }[];
  commentsInputName: string;
};

export default function SessionRatings({
  schoolId,
  open,
  onOpenChange,
  ratings,
  project,
  mode,
  children,
}: {
  schoolId: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  ratings: Prisma.InterventionSessionRatingGetPayload<{
    include: {
      session: true;
    };
  }>[];
  project?: Prisma.ProjectGetPayload<{}>;
  mode: "view" | "add";
  children: React.ReactNode;
}) {
  // TODO: use session date to sort
  const _rating = ratings.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  const [existingRating, setExistingRating] = useState<
    | Prisma.InterventionSessionRatingGetPayload<{
        include: {
          session: true;
        };
      }>
    | undefined
  >(_rating);
  const [updateWindowDuration, setUpdateWindowDuration] = useState<number>(0);
  const pathname = usePathname();

  const form = useForm<z.infer<typeof SessionRatingsSchema>>({
    resolver: zodResolver(SessionRatingsSchema),
    defaultValues: {
      mode,
      sessionId: existingRating?.sessionId ?? undefined,
      studentBehaviorRating: existingRating?.studentBehaviorRating ?? undefined,
      adminSupportRating: existingRating?.adminSupportRating ?? undefined,
      workloadRating: existingRating?.workloadRating ?? undefined,
      // TODO: add extra fields to schema
      // recommendations: existingRating?.workloadRating ?? undefined,
      // challenges: existingRating?.workloadRating ?? undefined,
      // positiveHighlights: existingRating?.workloadRating ?? undefined,
    },
  });

  useEffect(() => {
    const values = {
      mode,
      sessionId:
        mode === "add" && existingRating === undefined
          ? form.getValues("sessionId")
          : (existingRating?.sessionId ?? undefined),
      studentBehaviorRating: existingRating?.studentBehaviorRating ?? undefined,
      adminSupportRating: existingRating?.adminSupportRating ?? undefined,
      workloadRating: existingRating?.workloadRating ?? undefined,
      // TODO: add extra fields to schema
      // recommendations: existingRating?.workloadRating ?? undefined,
      // challenges: existingRating?.workloadRating ?? undefined,
      // positiveHighlights: existingRating?.workloadRating ?? undefined,
    };
    form.reset(values);

    if (existingRating) {
      setUpdateWindowDuration(
        differenceInSeconds(addDays(existingRating.createdAt, 14), new Date()),
      );
    }
  }, [existingRating]);

  useEffect(() => {
    if (!open) {
      setExistingRating(undefined);
    } else {
      setExistingRating(_rating);
    }
  }, [schoolId, open]);

  const onSubmit = async (data: z.infer<typeof SessionRatingsSchema>) => {
    // TODO: add submit logic
  };

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-2/5 max-w-none p-5 text-base font-medium leading-6">
          <DialogHeader>
            <h2 className="text-xl font-bold">Weekly session report</h2>
          </DialogHeader>
          {children}
          {mode === "view" && ratings.length === 0 ? (
            <div className="space-y-3">
              <div className="item-center flex justify-center text-shamiri-text-dark-grey">
                No reports found.
              </div>
              <Separator />
              <DialogFooter className="flex justify-end">
                <Button
                  className=""
                  variant="brand"
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={cn(
                "space-y-5",
                mode === "view" ? "form-view-mode" : "",
              )}
            >
              <FormField
                control={form.control}
                name="sessionId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>
                      Select session{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>{" "}
                    <Select
                      defaultValue={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const match = ratings.find((rating) => {
                          return rating.sessionId === value;
                        });
                        setExistingRating(match);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a session" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {ratings.map((rating) => {
                          return (
                            <SelectItem
                              key={rating.id}
                              value={rating.sessionId ?? " "}
                            >
                              {/*TODO: Refactor with new session_names table*/}
                              <span>{rating.session?.sessionName}</span> -{" "}
                              <span>
                                {rating.session?.sessionDate &&
                                  format(
                                    rating.session?.sessionDate,
                                    "dd MMM yyyy",
                                  )}
                              </span>{" "}
                              -{" "}
                              <span>
                                {rating.session?.sessionDate &&
                                  format(rating.session?.sessionDate, "h:mm a")}
                              </span>{" "}
                              -{" "}
                              <span>
                                {rating.session?.sessionDate &&
                                  format(
                                    rating.session?.sessionEndTime ??
                                      addHours(rating.session?.sessionDate, 1),
                                    "h:mm a",
                                  )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {mode !== "view" && existingRating && updateWindowDuration > 0 ? (
                <DialogAlertWidget separator={false}>
                  <div className="flex items-center gap-2">
                    <span>
                      Update ratings by{" "}
                      {format(
                        addDays(existingRating.createdAt, 14),
                        "dd-MM-yyyy",
                      )}{" "}
                      (
                      <CountdownTimer duration={updateWindowDuration} />)
                    </span>
                  </div>
                </DialogAlertWidget>
              ) : null}
              <Separator />
              <div className="flex flex-col space-y-4 divide-y">
                <div className="flex flex-col space-y-3 text-sm">
                  <FormField
                    control={form.control}
                    name="studentBehaviorRating"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel>
                          Student behaviour (1-unacceptable to 5-outstanding){" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <RatingStarsInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={
                            mode === "view" ||
                            (existingRating && updateWindowDuration === 0)
                          }
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminSupportRating"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel>
                          Admin support (1-unacceptable to 5-outstanding){" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <RatingStarsInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={
                            mode === "view" ||
                            (existingRating && updateWindowDuration === 0)
                          }
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workloadRating"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel>
                          Workload (1-unacceptable to 5-outstanding){" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <RatingStarsInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={
                            mode === "view" ||
                            (existingRating && updateWindowDuration === 0)
                          }
                        />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <Separator />
              {mode !== "view" &&
              (existingRating === undefined ||
                (existingRating && updateWindowDuration > 0)) ? (
                <div className="space-y-5">
                  <DialogFooter className="flex justify-end">
                    <Button
                      className=""
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="brand"
                      type="submit"
                      disabled={
                        form.formState.isSubmitting ||
                        (existingRating && updateWindowDuration < 0)
                      }
                      loading={form.formState.isSubmitting}
                    >
                      {existingRating ? "Update & save" : "Submit"}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <DialogFooter className="flex justify-end">
                  <Button
                    className=""
                    variant="brand"
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Form>
  );
}
