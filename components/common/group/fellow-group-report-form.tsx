"use client";

import { SupportType } from "@prisma/client";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { type Control, useForm } from "react-hook-form";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import {
  ADAPTATION_TYPE_OPTIONS,
  CHALLENGE_IMPACT_OPTIONS,
  CONFIDENCE_OPTIONS,
  FREQUENCY_OPTIONS,
  MAX_REPORT_TEXT,
  RELATIONSHIP_OPTIONS,
  type ScaleOption,
  SECTION_TITLES,
  SUPPORT_TYPE_OPTIONS,
  TRANSFER_OPTIONS,
} from "#/components/common/group/fellow-group-report-options";
import {
  type FellowGroupReportFormData,
  FellowGroupReportSchema,
} from "#/components/common/group/schema";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { submitFellowGroupReport } from "#/lib/actions/group";
import { cn } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";

function Required() {
  return <span className="text-shamiri-light-red">*</span>;
}

type FieldName = keyof FellowGroupReportFormData;

function ScaleField({
  control,
  name,
  question,
  options,
}: {
  control: Control<FellowGroupReportFormData>;
  name: FieldName;
  question: string;
  options: ScaleOption[];
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="font-medium text-shamiri-text-dark-grey">
            {question} <Required />
          </FormLabel>
          <RadioGroup
            value={field.value === undefined ? "" : String(field.value)}
            onValueChange={(value) => field.onChange(Number(value))}
            className="gap-1"
          >
            {options.map((option) => (
              <label
                key={option.value}
                htmlFor={`${name}-${option.value}`}
                className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-blue-bg"
              >
                <RadioGroupItem value={String(option.value)} id={`${name}-${option.value}`} />
                <span>{option.label}</span>
              </label>
            ))}
          </RadioGroup>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function YesNoField({
  control,
  name,
  question,
}: {
  control: Control<FellowGroupReportFormData>;
  name: FieldName;
  question: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="font-medium text-shamiri-text-dark-grey">
            {question} <Required />
          </FormLabel>
          <RadioGroup
            value={field.value === undefined ? "" : field.value ? "yes" : "no"}
            onValueChange={(value) => field.onChange(value === "yes")}
            className="flex gap-6"
          >
            <label
              htmlFor={`${name}-no`}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <RadioGroupItem value="no" id={`${name}-no`} />
              <span>No</span>
            </label>
            <label
              htmlFor={`${name}-yes`}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <RadioGroupItem value="yes" id={`${name}-yes`} />
              <span>Yes</span>
            </label>
          </RadioGroup>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function TextField({
  control,
  name,
  question,
  required,
}: {
  control: Control<FellowGroupReportFormData>;
  name: FieldName;
  question: string;
  required?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel className="font-medium text-shamiri-text-dark-grey">
            {question} {required && <Required />}
          </FormLabel>
          <FormControl>
            <Textarea
              rows={3}
              maxLength={MAX_REPORT_TEXT}
              className="resize-none"
              value={(field.value as string) ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          </FormControl>
          <div className="flex justify-between">
            <FormMessage />
            <span className="text-xs text-shamiri-text-grey">
              {((field.value as string) ?? "").length}/{MAX_REPORT_TEXT}
            </span>
          </div>
        </FormItem>
      )}
    />
  );
}

function SectionShell({
  index,
  innerRef,
  children,
}: {
  index: number;
  innerRef: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div ref={innerRef} className="flex flex-col space-y-4 py-5">
      <div className="text-lg font-semibold text-shamiri-text-dark-grey">
        Section {index + 1} — {SECTION_TITLES[index]}
      </div>
      {children}
    </div>
  );
}

export default function FellowGroupReportForm({
  groupId,
  projectId,
  groupName,
  open,
  onOpenChange,
}: {
  groupId: string;
  projectId: string;
  groupName: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  const pathname = usePathname();
  const [showDiscard, setShowDiscard] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const form = useForm<FellowGroupReportFormData>({
    resolver: zodResolver(FellowGroupReportSchema),
    mode: "onChange",
    defaultValues: {
      groupId,
      projectId,
      homePracticeApplicable: true,
    },
  });

  const adaptationsMade = form.watch("adaptationsMade");
  const climateConcerns = form.watch("climateConcerns");
  const externalDisruptions = form.watch("externalDisruptions");
  const homePracticeApplicable = form.watch("homePracticeApplicable");
  const supportType = form.watch("supportType");

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const top = event.currentTarget.scrollTop + 80;
    let active = 0;
    sectionRefs.current.forEach((section, index) => {
      if (section && section.offsetTop <= top) {
        active = index;
      }
    });
    setCurrentSection(active);
  };

  const requestClose = () => {
    if (form.formState.isSubmitting) {
      return;
    }
    if (form.formState.isDirty) {
      setShowDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  const onSubmit = async (data: FellowGroupReportFormData) => {
    const response = await submitFellowGroupReport(data);
    if (!response.success) {
      toast({
        variant: "destructive",
        description: response.message ?? "Something went wrong during submission, please try again",
      });
      return;
    }
    await revalidatePageAction(pathname);
    toast({ description: response.message });
    form.reset();
    onOpenChange(false);
  };

  return (
    <>
      <Form {...form}>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              requestClose();
              return;
            }
            onOpenChange(next);
          }}
        >
          <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0">
            <DialogHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
              <div className="flex flex-col text-left">
                <DialogTitle className="text-xl font-bold">Group Report</DialogTitle>
                <span className="text-sm text-shamiri-text-grey">
                  {groupName} · Section {currentSection + 1} of {SECTION_TITLES.length}
                </span>
              </div>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
              <div
                onScroll={handleScroll}
                className="relative flex-1 divide-y overflow-y-auto px-6"
              >
                <SectionShell
                  index={0}
                  innerRef={(el) => {
                    sectionRefs.current[0] = el;
                  }}
                >
                  <ScaleField
                    control={form.control}
                    name="structuralFidelity"
                    question="How often were the core session activities completed in full?"
                    options={FREQUENCY_OPTIONS}
                  />
                  <ScaleField
                    control={form.control}
                    name="processFidelity"
                    question="How often were the core activities delivered with the intended quality, not just completed?"
                    options={FREQUENCY_OPTIONS}
                  />
                </SectionShell>

                <SectionShell
                  index={1}
                  innerRef={(el) => {
                    sectionRefs.current[1] = el;
                  }}
                >
                  <YesNoField
                    control={form.control}
                    name="adaptationsMade"
                    question="Were any repeated adaptations made across the cycle?"
                  />
                  {adaptationsMade ? (
                    <>
                      <FormField
                        control={form.control}
                        name="adaptationType"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="font-medium text-shamiri-text-dark-grey">
                              If yes, what type was most common? <Required />
                            </FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ADAPTATION_TYPE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <TextField
                        control={form.control}
                        name="adaptationReason"
                        question="If yes, briefly describe the main reason"
                        required
                      />
                    </>
                  ) : null}
                </SectionShell>

                <SectionShell
                  index={2}
                  innerRef={(el) => {
                    sectionRefs.current[2] = el;
                  }}
                >
                  <ScaleField
                    control={form.control}
                    name="behavioralEngagement"
                    question="How often did most students actively participate in session activities?"
                    options={FREQUENCY_OPTIONS}
                  />
                  <ScaleField
                    control={form.control}
                    name="reflectiveEngagement"
                    question="How often did students engage reflectively — asking questions, making personal connections, or showing genuine curiosity?"
                    options={FREQUENCY_OPTIONS}
                  />
                </SectionShell>

                <SectionShell
                  index={3}
                  innerRef={(el) => {
                    sectionRefs.current[3] = el;
                  }}
                >
                  <ScaleField
                    control={form.control}
                    name="psychologicalSafety"
                    question="How often did students share their thoughts and feelings openly during sessions?"
                    options={FREQUENCY_OPTIONS}
                  />
                  <ScaleField
                    control={form.control}
                    name="groupCohesion"
                    question="How often did students respond to and support each other, rather than engaging only with the Fellow?"
                    options={FREQUENCY_OPTIONS}
                  />
                  <YesNoField
                    control={form.control}
                    name="climateConcerns"
                    question="Was there notable conflict, teasing, disruption, or avoidance during the cycle?"
                  />
                  {climateConcerns ? (
                    <TextField
                      control={form.control}
                      name="climateConcernsDetail"
                      question="Describe briefly."
                      required
                    />
                  ) : null}
                </SectionShell>

                <SectionShell
                  index={4}
                  innerRef={(el) => {
                    sectionRefs.current[4] = el;
                  }}
                >
                  <ScaleField
                    control={form.control}
                    name="skillComprehension"
                    question="How often did students seem to grasp the main session ideas — for example, being able to describe them in their own words?"
                    options={FREQUENCY_OPTIONS}
                  />
                  <ScaleField
                    control={form.control}
                    name="inSessionTransfer"
                    question="How often did students reference or apply ideas from earlier sessions in later sessions?"
                    options={TRANSFER_OPTIONS}
                  />
                  <FormItem className="space-y-2">
                    <FormLabel className="font-medium text-shamiri-text-dark-grey">
                      How often did students engage with home practice activities? <Required />
                    </FormLabel>
                    <label
                      htmlFor="homePracticeNotApplicable"
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id="homePracticeNotApplicable"
                        checked={!homePracticeApplicable}
                        onCheckedChange={(checked) => {
                          const applicable = checked !== true;
                          form.setValue("homePracticeApplicable", applicable, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          if (!applicable) {
                            form.setValue("homePracticeEngagement", undefined, {
                              shouldValidate: true,
                            });
                          }
                        }}
                      />
                      <span>Not applicable</span>
                    </label>
                    {homePracticeApplicable ? (
                      <ScaleField
                        control={form.control}
                        name="homePracticeEngagement"
                        question="Select how often students engaged with home practice activities"
                        options={FREQUENCY_OPTIONS}
                      />
                    ) : null}
                  </FormItem>
                </SectionShell>

                <SectionShell
                  index={5}
                  innerRef={(el) => {
                    sectionRefs.current[5] = el;
                  }}
                >
                  <ScaleField
                    control={form.control}
                    name="fellowGroupRelationship"
                    question="Overall, how would you rate your relationship and rapport with this group?"
                    options={RELATIONSHIP_OPTIONS}
                  />
                </SectionShell>

                {/* Section 7 — Implementation Context */}
                <SectionShell
                  index={6}
                  innerRef={(el) => {
                    sectionRefs.current[6] = el;
                  }}
                >
                  <YesNoField
                    control={form.control}
                    name="externalDisruptions"
                    question="Were there any significant external disruptions during this cycle that may have affected the group (e.g., exams, school events, community stressors)?"
                  />
                  {externalDisruptions ? (
                    <TextField
                      control={form.control}
                      name="externalDisruptionsDetail"
                      question="Describe briefly."
                      required
                    />
                  ) : null}
                </SectionShell>

                <SectionShell
                  index={7}
                  innerRef={(el) => {
                    sectionRefs.current[7] = el;
                  }}
                >
                  <ScaleField
                    control={form.control}
                    name="facilitatorConfidence"
                    question="Overall, how confident did you feel facilitating this group?"
                    options={CONFIDENCE_OPTIONS}
                  />
                  <TextField
                    control={form.control}
                    name="hardestAspect"
                    question="What was hardest about facilitating this group?"
                    required
                  />
                  <ScaleField
                    control={form.control}
                    name="challengeImpact"
                    question="How much did this challenge affect your ability to deliver the sessions as intended?"
                    options={CHALLENGE_IMPACT_OPTIONS}
                  />
                  <TextField
                    control={form.control}
                    name="whatWentWell"
                    question="What went well with this group?"
                    required
                  />
                </SectionShell>

                <SectionShell
                  index={8}
                  innerRef={(el) => {
                    sectionRefs.current[8] = el;
                  }}
                >
                  <FormField
                    control={form.control}
                    name="supportType"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="font-medium text-shamiri-text-dark-grey">
                          What type of support would have been most helpful during this cycle?{" "}
                          <Required />
                        </FormLabel>
                        <RadioGroup
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          className="gap-1"
                        >
                          {SUPPORT_TYPE_OPTIONS.map((option) => (
                            <label
                              key={option.value}
                              htmlFor={`support-${option.value}`}
                              className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-blue-bg"
                            >
                              <RadioGroupItem value={option.value} id={`support-${option.value}`} />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </RadioGroup>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {supportType && supportType !== SupportType.SUFFICIENT ? (
                    <TextField
                      control={form.control}
                      name="supportDetail"
                      question="Briefly describe."
                    />
                  ) : null}
                </SectionShell>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2 border-t px-6 py-4">
                <Button type="button" variant="ghost" onClick={requestClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={!form.formState.isValid || form.formState.isSubmitting}
                  loading={form.formState.isSubmitting}
                >
                  Submit Report
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Form>

      <Dialog open={showDiscard} onOpenChange={setShowDiscard}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Close without saving?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-shamiri-text-dark-grey">
            Your answers will not be saved. Are you sure you want to close?
          </p>
          <DialogFooter className={cn("flex justify-end gap-2")}>
            <Button type="button" variant="ghost" onClick={() => setShowDiscard(false)}>
              Continue editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setShowDiscard(false);
                form.reset();
                onOpenChange(false);
              }}
            >
              Close anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
