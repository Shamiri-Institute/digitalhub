import { zodResolver } from "@hookform/resolvers/zod";
import type { MonthlySupervisorEvaluation as MonthlySupervisorEvaluationType, Project } from "@prisma/client";
import { addDays, differenceInSeconds, eachMonthOfInterval, format, isEqual } from "date-fns";
import { usePathname } from "next/navigation";
import type React from "react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import CountdownTimer from "#/app/(platform)/hc/components/countdown-timer";
import { MonthlySupervisorEvaluationSchema } from "#/app/(platform)/hc/schemas";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { submitMonthlySupervisorEvaluation } from "#/app/(platform)/hc/supervisors/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
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
import { Input } from "#/components/ui/input";
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
import { cn } from "#/lib/utils";

type FormInput = {
  section: string;
  fields: {
    label: string;
    name: string;
    description: string;
  }[];
  commentsInputName: string;
};
export default function MonthlySupervisorEvaluation({
  supervisorId,
  children,
  isOpen,
  setIsOpen,
  project,
  evaluations,
  mode = "edit",
}: {
  supervisorId?: string;
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  project: Project | null;
  evaluations: MonthlySupervisorEvaluationType[];
  mode?: "view" | "edit";
}) {
  const [existingEvaluation, setExistingEvaluation] = useState<
    MonthlySupervisorEvaluationType | undefined
  >();
  const [updateWindowDuration, setUpdateWindowDuration] = useState<number>(0);
  const pathname = usePathname();
  const isViewMode = mode === "view";

  const form = useForm<z.infer<typeof MonthlySupervisorEvaluationSchema>>({
    resolver: zodResolver(MonthlySupervisorEvaluationSchema),
    defaultValues: {
      supervisorId: supervisorId ?? "",
      respectfulness: undefined,
      attitude: undefined,
      collaboration: undefined,
      reliability: undefined,
      identificationOfIssues: undefined,
      leadership: undefined,
      communicationStyle: undefined,
      conflictResolution: undefined,
      adaptability: undefined,
      recognitionAndFeedback: undefined,
      decisionMaking: undefined,
      fellowRecruitmentEffectiveness: undefined,
      fellowTrainingEffectiveness: undefined,
      programLogisticsCoordination: undefined,
      programSessionAttendance: undefined,
      workplaceDemeanorComments: undefined,
      managementStyleComments: undefined,
      programExecutionComments: undefined,
    },
  });

  const formInputs: FormInput[] = [
    {
      section: "Workplace demeanor",
      fields: [
        {
          label: "Respectfulness (1-unacceptable to 5-outstanding)",
          name: "respectfulness",
          description:
            "Assesses the supervisor's respect level in interactions with team members, recognizing individual contributions and perspectives.",
        },
        {
          label: "Attitude (1-unacceptable to 5-outstanding)",
          name: "attitude",
          description:
            "Assesses the supervisor's respect level in interactions with team members, recognizing individual contributions and perspectives.",
        },
        {
          label: "Collaboration (1-unacceptable to 5-outstanding)",
          name: "collaboration",
          description:
            "Evaluates the supervisor's ability to collaborate with team members, encouraging teamwork and collective efforts.",
        },
        {
          label: "Reliability (1-unacceptable to 5-outstanding)",
          name: "reliability",
          description: "Assesses the supervisor's consistency, dependability, and trustworthiness",
        },
        {
          label: "Identification of issues (1-unacceptable to 5-outstanding)",
          name: "identificationOfIssues",
          description:
            "Assesses the supervisor's aptitude in identifying and addressing potential issues.",
        },
      ],
      commentsInputName: "workplaceDemeanorComments",
    },
    {
      section: "Management/supervision style",
      fields: [
        {
          label: "Leadership (1-unacceptable to 5-outstanding)",
          name: "leadership",
          description:
            "Assesses the supervisor's leadership skills in inspiring and guiding the team, employing various leadership styles such as transformational, delegative, authoritative, transactional, participative/democratic, and servant leadership.",
        },
        {
          label: "Communication style (1-unacceptable to 5-outstanding)",
          name: "communicationStyle",
          description:
            "Assesses the supervisor’s level of clarity, effectiveness, and openness in conveying information about the program (includes timely and clear communication with fellows, Shamiri staff, and school administrators/teachers, and submission of weekly reports), ensuring transparent and constructive information flow.",
        },
        {
          label: "Conflict resolution (1-unacceptable to 5-outstanding)",
          name: "conflictResolution",
          description:
            "Assesses the supervisor's handling of team conflicts and the effectiveness of resolution strategies in maintaining a positive team dynamic.",
        },
        {
          label: "Adaptability (1-unacceptable to 5-outstanding)",
          name: "adaptability",
          description:
            "Examines how well the supervisor adapts to different situations, demonstrating flexibility in response to challenges and changes within the team or school environment.",
        },
        {
          label: "Recognition and feedback (1-unacceptable to 5-outstanding)",
          name: "recognitionAndFeedback",
          description:
            "Assesses the supervisor's recognition of fellow contributions as well as the frequency and effectiveness of the feedback they provide.",
        },
        {
          label: "Decision making (1-unacceptable to 5-outstanding)",
          name: "decisionMaking",
          description:
            "Evaluates the supervisor's ability to make timely, informed decisions, assessing the collaborative or directive nature of the decision-making process.",
        },
      ],
      commentsInputName: "managementStyleComments",
    },
    {
      section: "Program execution",
      fields: [
        {
          label: "Fellow recruitment effectiveness (1-unacceptable to 5-outstanding)",
          name: "fellowRecruitmentEffectiveness",
          description:
            "Assesses successful screening of fellow position candidates, effective conduction of fellow interviews, providing a final list of successful candidates, and timely completion of orientation and onboarding of fellows.",
        },
        {
          label: "Fellow training effectiveness (1-unacceptable to 5-outstanding)",
          name: "fellowTrainingEffectiveness",
          description:
            "Assesses the completion of fellow training tasks based on the number of half-days completed by fellows under a supervisor",
        },
        {
          label: "Program logistics co-ordination (1-unacceptable to 5-outstanding)",
          name: "programLogisticsCoordination",
          description:
            "Assesses supervisor’s management of physical attendance sheets, reporting absenteeism of fellows, coordinating logistics for their fellows, and handling the movement of program materials.",
        },
        {
          label: "Program session attendance (1-unacceptable to 5-outstanding)",
          name: "programSessionAttendance",
          description:
            "Assesses supervisor’s management of physical attendance sheets, reporting absenteeism of fellows, coordinating logistics for their fellows, and handling the movement of program materials.",
        },
      ],
      commentsInputName: "programExecutionComments",
    },
  ];

  const defaultValues = {
    supervisorId,
    respectfulness: undefined,
    attitude: undefined,
    collaboration: undefined,
    reliability: undefined,
    identificationOfIssues: undefined,
    leadership: undefined,
    communicationStyle: undefined,
    conflictResolution: undefined,
    adaptability: undefined,
    recognitionAndFeedback: undefined,
    decisionMaking: undefined,
    fellowRecruitmentEffectiveness: undefined,
    fellowTrainingEffectiveness: undefined,
    programLogisticsCoordination: undefined,
    programSessionAttendance: undefined,
    workplaceDemeanorComments: undefined,
    managementStyleComments: undefined,
    programExecutionComments: undefined,
  };

  const months =
    project !== null && project.actualStartDate !== null
      ? eachMonthOfInterval({
          start: project.actualStartDate,
          end: project.actualEndDate ?? new Date(),
        })
      : [];

  const onSubmit = async (data: z.infer<typeof MonthlySupervisorEvaluationSchema>) => {
    const response = await submitMonthlySupervisorEvaluation(data);
    if (!response.success) {
      toast({
        description: response.message ?? "Something went wrong, please try again",
      });
      return;
    }
    toast({
      description: response.message,
    });
    revalidatePageAction(pathname).then(() => {
      setIsOpen(false);
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setExistingEvaluation(undefined);
      form.reset(defaultValues);
    } else if (isOpen && isViewMode && evaluations.length > 0) {
      // Auto-select first evaluation month in view mode
      const firstEvaluation = evaluations[0];
      if (firstEvaluation) {
        updateFormValues(format(firstEvaluation.month, "yyyy-MM-dd"));
      }
    }
  }, [supervisorId, isOpen, isViewMode, evaluations]);

  useEffect(() => {
    if (existingEvaluation) {
      setUpdateWindowDuration(
        differenceInSeconds(addDays(existingEvaluation.createdAt, 14), new Date()),
      );
    }
  }, [existingEvaluation]);

  const updateFormValues = (value: string) => {
    const match = evaluations.find((evaluation) =>
      isEqual(new Date(evaluation.month), new Date(value)),
    );

    if (match) {
      setExistingEvaluation(match);
      const {
        respectfulness,
        attitude,
        collaboration,
        reliability,
        identificationOfIssues,
        workplaceDemeanorComments,
        leadership,
        communicationStyle,
        conflictResolution,
        adaptability,
        recognitionAndFeedback,
        decisionMaking,
        managementStyleComments,
        fellowRecruitmentEffectiveness,
        fellowTrainingEffectiveness,
        programLogisticsCoordination,
        programSessionAttendance,
        programExecutionComments,
        month,
      } = match;
      form.reset({
        month,
        supervisorId,
        respectfulness,
        attitude,
        collaboration,
        reliability,
        identificationOfIssues,
        leadership,
        communicationStyle,
        conflictResolution,
        adaptability,
        recognitionAndFeedback,
        decisionMaking,
        fellowRecruitmentEffectiveness,
        fellowTrainingEffectiveness,
        programLogisticsCoordination,
        programSessionAttendance,
        workplaceDemeanorComments: workplaceDemeanorComments ?? undefined,
        managementStyleComments: managementStyleComments ?? undefined,
        programExecutionComments: programExecutionComments ?? undefined,
      });
    } else {
      form.reset({ month: new Date(value), ...defaultValues });
      setExistingEvaluation(undefined);
    }
  };

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-2/5 max-w-none p-5 text-base font-medium leading-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {isViewMode ? "View supervisor evaluations" : "Monthly supervisor evaluation"}
            </DialogTitle>
          </DialogHeader>
          {children}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Select month {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                  </FormLabel>
                  <Select
                    value={field.value ? format(field.value, "yyyy-MM-dd") : undefined}
                    onValueChange={(value) => {
                      field.onChange(new Date(value));
                      updateFormValues(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {months.map((month, index) => {
                        return (
                          <SelectItem key={index.toString()} value={format(month, "yyyy-MM-dd")}>
                            Month {index + 1} - {format(month, "MMM yyyy")}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {existingEvaluation && updateWindowDuration >= 0 ? (
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
            <FormField
              control={form.control}
              name="supervisorId"
              render={({ field }) => (
                <FormItem>
                  <Input
                    id="supervisorId"
                    name="supervisorId"
                    type="hidden"
                    value={field.value ?? ""}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <div className="flex flex-col space-y-4 divide-y">
              {formInputs.map((input) => {
                return (
                  <div key={input.section} className="flex flex-col space-y-2 py-4">
                    <div>
                      <span className="text-bold text-lg">{input.section}</span>{" "}
                      {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                    </div>
                    <div className="flex flex-col space-y-3 text-sm">
                      {input.fields.map((inputField) => (
                        <FormField
                          key={inputField.name}
                          control={form.control}
                          name={inputField.name as keyof typeof form.formState.defaultValues}
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-2">
                              <FormLabel>
                                <span>{inputField.label}</span>{" "}
                                {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                              </FormLabel>
                              <span className="text-shamiri-text-grey">
                                {inputField.description}
                              </span>
                              <RatingStarsInput
                                value={field.value}
                                onChange={field.onChange}
                                disabled={
                                  isViewMode || (existingEvaluation && updateWindowDuration === 0)
                                }
                              />
                            </FormItem>
                          )}
                        />
                      ))}
                      <FormField
                        control={form.control}
                        name={input.commentsInputName as keyof typeof form.formState.defaultValues}
                        disabled={isViewMode || (existingEvaluation && updateWindowDuration <= 0)}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                className="resize-none"
                                {...field}
                                disabled={
                                  isViewMode || (existingEvaluation && updateWindowDuration <= 0)
                                }
                                readOnly={isViewMode}
                                placeholder={
                                  isViewMode
                                    ? ""
                                    : existingEvaluation && updateWindowDuration <= 0
                                      ? ""
                                      : "Type additional comments"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {!isViewMode &&
              (existingEvaluation === undefined ||
                (existingEvaluation && updateWindowDuration >= 0)) && (
                <div className="space-y-5">
                  <Separator />
                  <DialogFooter className="flex justify-end">
                    <Button
                      className=""
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
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
              )}
            {isViewMode && (
              <div className="space-y-5">
                <Separator />
                <DialogFooter className="flex justify-end">
                  <Button
                    variant="brand"
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                    }}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}
          </form>
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
          return disabled ? (
            <span
              key={index.toString()}
              className={cn(
                "peer relative h-5 w-5 shrink transition ease-in",
                value && value >= 5 - index
                  ? "text-shamiri-light-orange"
                  : "text-shamiri-light-grey",
              )}
            >
              <Icons.starRating className="h-full w-full" />
            </span>
          ) : (
            <button
              key={index.toString()}
              type="button"
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
