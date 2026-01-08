"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Project, WeeklyFellowRatings } from "@prisma/client";
import { addDays, differenceInSeconds, eachWeekOfInterval, format, isEqual } from "date-fns";
import { usePathname } from "next/navigation";
import type React from "react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import CountdownTimer from "#/app/(platform)/hc/components/countdown-timer";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { WeeklyFellowEvaluationSchema } from "#/components/common/fellow/schema";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { submitWeeklyFellowEvaluation } from "#/lib/actions/fellow";
import { cn } from "#/lib/utils";

export default function WeeklyFellowEvaluation({
  fellowId,
  open,
  onOpenChange,
  evaluations,
  project,
  mode,
  children,
}: {
  fellowId: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  evaluations: WeeklyFellowRatings[];
  project?: Project;
  mode: "view" | "add";
  children: React.ReactNode;
}) {
  const _evaluation = evaluations.sort((a, b) => b.week.getTime() - a.week.getTime())[0];
  const [existingEvaluation, setExistingEvaluation] = useState<WeeklyFellowRatings | undefined>(
    _evaluation,
  );
  const [updateWindowDuration, setUpdateWindowDuration] = useState<number>(0);
  const pathname = usePathname();

  const weeks =
    mode === "view"
      ? evaluations.map((x) => x.week).sort((a, b) => a.getTime() - b.getTime())
      : project && project.actualStartDate !== null
        ? eachWeekOfInterval({
            start: project.actualStartDate,
            end: project.actualEndDate ?? new Date(),
          })
        : [];

  const form = useForm<z.infer<typeof WeeklyFellowEvaluationSchema>>({
    resolver: zodResolver(WeeklyFellowEvaluationSchema),
    defaultValues: {
      fellowId,
      mode,
      week: existingEvaluation?.week,
      behaviourNotes: existingEvaluation?.behaviourNotes ?? "",
      behaviourRating: existingEvaluation?.behaviourRating ?? 0,
      programDeliveryNotes: existingEvaluation?.programDeliveryNotes ?? "",
      programDeliveryRating: existingEvaluation?.programDeliveryRating ?? 0,
      dressingAndGroomingNotes: existingEvaluation?.dressingAndGroomingNotes ?? "",
      dressingAndGroomingRating: existingEvaluation?.dressingAndGroomingRating ?? 0,
      punctualityNotes: existingEvaluation?.punctualityNotes ?? "",
      punctualityRating: existingEvaluation?.punctualityRating ?? 0,
    },
  });

  useEffect(() => {
    if (!open) {
      setExistingEvaluation(undefined);
    } else {
      setExistingEvaluation(_evaluation);
    }
  }, [fellowId, open]);

  useEffect(() => {
    const values = {
      fellowId,
      mode,
      week:
        mode === "add" && existingEvaluation === undefined
          ? form.getValues("week")
          : existingEvaluation?.week,
      behaviourNotes: existingEvaluation?.behaviourNotes ?? "",
      behaviourRating: existingEvaluation?.behaviourRating ?? 0,
      programDeliveryNotes: existingEvaluation?.programDeliveryNotes ?? "",
      programDeliveryRating: existingEvaluation?.programDeliveryRating ?? 0,
      dressingAndGroomingNotes: existingEvaluation?.dressingAndGroomingNotes ?? "",
      dressingAndGroomingRating: existingEvaluation?.dressingAndGroomingRating ?? 0,
      punctualityNotes: existingEvaluation?.punctualityNotes ?? "",
      punctualityRating: existingEvaluation?.punctualityRating ?? 0,
    };
    form.reset(values);

    if (existingEvaluation) {
      setUpdateWindowDuration(
        differenceInSeconds(addDays(existingEvaluation.createdAt, 14), new Date()),
      );
    }
  }, [existingEvaluation]);

  const onSubmit = async (data: z.infer<typeof WeeklyFellowEvaluationSchema>) => {
    const response = await submitWeeklyFellowEvaluation(data);
    if (!response.success) {
      toast({
        description: response.message ?? "Something went wrong, please try again",
      });
      return;
    }
    toast({
      description: response.message,
    });
    await revalidatePageAction(pathname).then(() => {
      onOpenChange(false);
    });
  };

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-2/5 max-w-none p-5 text-base font-medium leading-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Weekly fellow evaluation</DialogTitle>
          </DialogHeader>
          {children}
          {mode === "view" && evaluations.length === 0 ? (
            <div className="space-y-3">
              <div className="item-center flex justify-center text-shamiri-text-dark-grey">
                No evaluations found.
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="week"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>
                      Select week <span className="text-shamiri-light-red">*</span>
                    </FormLabel>{" "}
                    <Select
                      key={new Date().toISOString()}
                      defaultValue={field.value ? format(field.value, "yyyy-MM-dd") : " "}
                      onValueChange={(value) => {
                        field.onChange(new Date(value));
                        const match = evaluations.find((evaluation) =>
                          isEqual(new Date(evaluation.week), new Date(value)),
                        );

                        setExistingEvaluation(match);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a week" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {weeks.map((week, index) => {
                          return (
                            <SelectItem key={index.toString()} value={format(week, "yyyy-MM-dd")}>
                              Week {index + 1} - {format(week, "dd MMM yyyy")} to{" "}
                              {format(addDays(week, 6), "dd MMM yyyy")}
                            </SelectItem>
                          );
                        })}
                        {weeks.length === 0 ? (
                          <SelectItem value={" "} disabled={true}>
                            Missing project dates.
                          </SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {mode !== "view" && existingEvaluation && updateWindowDuration > 0 ? (
                <DialogAlertWidget separator={false}>
                  <div className="flex items-center gap-2">
                    <span>
                      Update ratings by{" "}
                      {format(addDays(existingEvaluation.createdAt, 14), "dd-MM-yyyy")} (
                      <CountdownTimer duration={updateWindowDuration} />)
                    </span>
                  </div>
                </DialogAlertWidget>
              ) : null}
              <Separator />
              <div className="flex flex-col space-y-3 text-sm">
                <FormField
                  control={form.control}
                  name="behaviourRating"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-2">
                      <FormLabel>
                        <span>Rate behaviour (1-unacceptable to 5-outstanding)</span>{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <RatingStarsInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={
                          mode === "view" || (existingEvaluation && updateWindowDuration === 0)
                        }
                      />
                    </FormItem>
                  )}
                />
                {mode !== "view" ? (
                  <FormField
                    control={form.control}
                    name="behaviourNotes"
                    disabled={existingEvaluation && updateWindowDuration <= 0}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            className="resize-none"
                            {...field}
                            rows={4}
                            placeholder={
                              existingEvaluation && updateWindowDuration <= 0
                                ? ""
                                : "pertains to evaluating the fellow's demeanor, covering approachability, respectfulness, attitude, collaboration, communication style."
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="rounded border bg-background-secondary px-4 py-2">
                    {existingEvaluation?.behaviourNotes}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="programDeliveryRating"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-2">
                      <FormLabel>
                        <span>Rate program delivery (1-unacceptable to 5-outstanding)</span>{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <RatingStarsInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={
                          mode === "view" || (existingEvaluation && updateWindowDuration === 0)
                        }
                      />
                    </FormItem>
                  )}
                />
                {mode !== "view" ? (
                  <FormField
                    control={form.control}
                    name="programDeliveryNotes"
                    disabled={existingEvaluation && updateWindowDuration <= 0}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            className="resize-none"
                            {...field}
                            rows={4}
                            placeholder={
                              existingEvaluation && updateWindowDuration <= 0
                                ? ""
                                : "assesses adherence to protocols, ethical standards, confidentiality, cultural competence"
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="rounded border bg-background-secondary px-4 py-2">
                    {existingEvaluation?.programDeliveryNotes}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="dressingAndGroomingRating"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-2">
                      <FormLabel>
                        <span>Rate dressing and grooming (1-very bad to 5-very good)</span>{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <RatingStarsInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={
                          mode === "view" || (existingEvaluation && updateWindowDuration === 0)
                        }
                      />
                    </FormItem>
                  )}
                />
                {mode !== "view" ? (
                  <FormField
                    control={form.control}
                    name="dressingAndGroomingNotes"
                    disabled={existingEvaluation && updateWindowDuration <= 0}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            className="resize-none"
                            {...field}
                            rows={4}
                            placeholder={
                              existingEvaluation && updateWindowDuration <= 0
                                ? ""
                                : "assesses the personal presentation of fellows considering appropriate attire and grooming standards in compliance with specific school administration requirements."
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="rounded border bg-background-secondary px-4 py-2">
                    {existingEvaluation?.dressingAndGroomingNotes}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="punctualityRating"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-2">
                      <FormLabel>
                        <span>
                          Rate session attendance and punctuality (1-very bad to 5-very good)
                        </span>{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <RatingStarsInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={
                          mode === "view" || (existingEvaluation && updateWindowDuration === 0)
                        }
                      />
                    </FormItem>
                  )}
                />
                {mode !== "view" ? (
                  <FormField
                    control={form.control}
                    name="punctualityNotes"
                    disabled={existingEvaluation && updateWindowDuration <= 0}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            className="resize-none"
                            {...field}
                            rows={4}
                            placeholder={
                              existingEvaluation && updateWindowDuration <= 0
                                ? ""
                                : "assesses the timely arrival and adherence to scheduled program sessions, including supervision and school sessions"
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="rounded border bg-background-secondary px-4 py-2">
                    {existingEvaluation?.punctualityNotes}
                  </div>
                )}
              </div>
              <Separator />
              {mode !== "view" &&
              (existingEvaluation === undefined ||
                (existingEvaluation && updateWindowDuration > 0)) ? (
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
                        (existingEvaluation && updateWindowDuration < 0)
                      }
                      loading={form.formState.isSubmitting}
                    >
                      {existingEvaluation ? "Update & save" : "Submit"}
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

function RatingStarsInput({
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
