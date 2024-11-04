"use client";

import CountdownTimer from "#/app/(platform)/hc/components/countdown-timer";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { StudentGroupEvaluationSchema } from "#/components/common/group/schema";
import RatingStarsInput from "#/components/common/rating-stars-input";
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
import { Textarea } from "#/components/ui/textarea";
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

export default function StudentGroupEvaluation({
  groupId,
  open,
  onOpenChange,
  evaluations,
  project,
  mode,
  children,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  evaluations: Prisma.InterventionGroupReportGetPayload<{
    include: {
      session: true;
    };
  }>[];
  project?: Prisma.ProjectGetPayload<{}>;
  mode: "view" | "add";
  children: React.ReactNode;
}) {
  const formInputs: FormInput[] = [
    {
      section: "Group Engagement & Participation",
      description:
        "On a scale of 1-5 where 1 means none of them and 5 means all of them please rate the proportion of students who:",
      fields: [
        {
          label: "Expressed themselves openly during group discussions",
          name: "engagement1",
        },
        {
          label: "Showed noticeable effort in completing assignments",
          name: "engagement2",
        },
        {
          label: "Collaborated effectively with their peers",
          name: "engagement3",
        },
      ],
      commentsInputName: "engagementComment",
    },
    {
      section: "Group Discipline & Cooperation",
      description:
        "On a scale of 1-5 where 1 means none of them and 5 means all of them please rate the proportion of students who:",
      fields: [
        {
          label: "Willingly adhered to the set group rules",
          name: "cooperation1",
        },
        {
          label: "Had mutual respect and understanding towards each other",
          name: "cooperation2",
        },
        {
          label: "Effectively resolved conflicts among themselves",
          name: "cooperation3",
        },
      ],
      commentsInputName: "cooperationComment",
    },
    {
      section: "Content coverage",
      description:
        "On a scale of 1-5, where 1 means none of the topics were covered and 5 means all of the topics were covered, rate your overall performance in covering all the contents as per the protocol. ",
      fields: [
        {
          name: "content",
        },
      ],
      commentsInputName: "cooperationComment",
    },
  ];
  // TODO: use session date to sort
  const _evaluation = evaluations.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  const [existingEvaluation, setExistingEvaluation] = useState<
    | Prisma.InterventionGroupReportGetPayload<{
        include: {
          session: true;
        };
      }>
    | undefined
  >(_evaluation);
  const [updateWindowDuration, setUpdateWindowDuration] = useState<number>(0);
  const pathname = usePathname();

  const form = useForm<z.infer<typeof StudentGroupEvaluationSchema>>({
    resolver: zodResolver(StudentGroupEvaluationSchema),
    defaultValues: {
      mode,
      groupId,
      engagementComment: existingEvaluation?.engagementComment ?? "",
      engagement1: existingEvaluation?.engagement1 ?? undefined,
      engagement2: existingEvaluation?.engagement2 ?? undefined,
      engagement3: existingEvaluation?.engagement3 ?? undefined,
      cooperationComment: existingEvaluation?.cooperationComment ?? "",
      cooperation1: existingEvaluation?.cooperation1 ?? undefined,
      cooperation2: existingEvaluation?.cooperation2 ?? undefined,
      cooperation3: existingEvaluation?.cooperation3 ?? undefined,
      contentComment: existingEvaluation?.contentComment ?? "",
      content: existingEvaluation?.content ?? 0,
      sessionId: existingEvaluation?.sessionId ?? undefined,
    },
  });

  useEffect(() => {
    const values = {
      groupId,
      mode,
      engagementComment: existingEvaluation?.engagementComment ?? "",
      engagement1: existingEvaluation?.engagement1 ?? undefined,
      engagement2: existingEvaluation?.engagement2 ?? undefined,
      engagement3: existingEvaluation?.engagement3 ?? undefined,
      cooperationComment: existingEvaluation?.cooperationComment ?? "",
      cooperation1: existingEvaluation?.cooperation1 ?? undefined,
      cooperation2: existingEvaluation?.cooperation2 ?? undefined,
      cooperation3: existingEvaluation?.cooperation3 ?? undefined,
      contentComment: existingEvaluation?.contentComment ?? "",
      content: existingEvaluation?.content ?? 0,
      sessionId:
        mode === "add" && existingEvaluation === undefined
          ? form.getValues("sessionId")
          : existingEvaluation?.sessionId ?? undefined,
    };
    form.reset(values);

    if (existingEvaluation) {
      setUpdateWindowDuration(
        differenceInSeconds(
          addDays(existingEvaluation.createdAt, 14),
          new Date(),
        ),
      );
    }
  }, [existingEvaluation]);

  useEffect(() => {
    if (!open) {
      setExistingEvaluation(undefined);
    } else {
      setExistingEvaluation(_evaluation);
    }
  }, [groupId, open]);

  const onSubmit = async (
    data: z.infer<typeof StudentGroupEvaluationSchema>,
  ) => {
    // TODO: add submit logic
  };

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-2/5 max-w-none p-5 text-base font-medium leading-6">
          <DialogHeader>
            <h2 className="text-xl font-bold">Student group evaluation</h2>
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
                        const match = evaluations.find((evaluation) => {
                          return evaluation.sessionId === value;
                        });
                        setExistingEvaluation(match);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a session" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {evaluations.map((evaluation) => {
                          return (
                            // TODO: make sessionId not nullable on db schema
                            <SelectItem
                              key={evaluation.id}
                              value={evaluation.sessionId ?? " "}
                            >
                              {/*TODO: Refactor with new session_names table*/}
                              <span>
                                {evaluation.session?.sessionName}
                              </span> -{" "}
                              <span>
                                {evaluation.session?.sessionDate &&
                                  format(
                                    evaluation.session?.sessionDate,
                                    "dd MMM yyyy",
                                  )}
                              </span>{" "}
                              -{" "}
                              <span>
                                {evaluation.session?.sessionDate &&
                                  format(
                                    evaluation.session?.sessionDate,
                                    "h:mm a",
                                  )}
                              </span>{" "}
                              -{" "}
                              <span>
                                {evaluation.session?.sessionDate &&
                                  format(
                                    evaluation.session?.sessionEndTime ??
                                      addHours(
                                        evaluation.session?.sessionDate,
                                        1,
                                      ),
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
              {mode !== "view" &&
              existingEvaluation &&
              updateWindowDuration > 0 ? (
                <DialogAlertWidget separator={false}>
                  <div className="flex items-center gap-2">
                    <span>
                      Update ratings by{" "}
                      {format(
                        addDays(existingEvaluation.createdAt, 14),
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
                {formInputs.map((input) => {
                  return (
                    <div
                      key={input.section}
                      className="flex flex-col space-y-2 py-4"
                    >
                      <div className="label">
                        <div className="text-bold text-lg">{input.section}</div>{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </div>
                      <span>{input.description}</span>
                      <div className="flex flex-col space-y-3 text-sm">
                        {input.fields.map((inputField) => (
                          <FormField
                            key={inputField.name}
                            control={form.control}
                            name={
                              inputField.name as keyof typeof form.formState.defaultValues
                            }
                            render={({ field }) => (
                              <FormItem className="flex flex-col space-y-2">
                                <FormLabel>
                                  <div className="text-shamiri-text-dark-grey">
                                    {inputField.label}
                                  </div>{" "}
                                  {inputField.label && (
                                    <span className="text-shamiri-light-red">
                                      *
                                    </span>
                                  )}
                                </FormLabel>
                                <RatingStarsInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  disabled={
                                    mode === "view" ||
                                    (existingEvaluation &&
                                      updateWindowDuration === 0)
                                  }
                                />
                              </FormItem>
                            )}
                          />
                        ))}
                        {mode !== "view" ? (
                          <FormField
                            control={form.control}
                            name={
                              input.commentsInputName as keyof typeof form.formState.defaultValues
                            }
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    disabled={
                                      existingEvaluation &&
                                      updateWindowDuration === 0
                                    }
                                    className="resize-none"
                                    {...field}
                                  ></Textarea>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <div className="rounded border bg-background-secondary px-4 py-2">
                            {form.getValues(
                              input.commentsInputName as keyof typeof form.formState.defaultValues,
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
