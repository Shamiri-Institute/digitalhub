"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  ClinicalCases,
  createClinicalCaseNotes,
} from "#/app/(platform)/sc/clinical/action";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
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
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";

const treatmentInterventions = [
  "Cognitive Behavioural Therapy",
  "Solution Focused Therapy",
  "Interpersonal Therapy",
  "Dialectical Behavioural Therapy",
  "Mindfulness-Based interventions",
  "Trauma-Focused CBT",
  "Narrative Exposure Therapy",
  "Social Skills Development",
  "Attachment, Self-Regulation and Competency",
  "Other",
] as const;

const riskLevels = ["no", "low", "medium", "high", "severe"] as const;

const emotionalResponses = ["Positive", "Negative", "Mixed"] as const;
const behavioralResponses = [
  "Commitment to Change",
  "Resistance or Hesitation",
  "Requests for further Support",
] as const;
const overallFeedback = ["Positive", "Negative", "Neutral"] as const;

const CaseReportSchema = z.object({
  sessionId: stringValidation("Session ID is required"),
  presentingIssues: stringValidation("Presenting issues are required"),
  orsAssessment: stringValidation("ORS assessment is required"),
  riskLevel: z.enum(riskLevels, {
    required_error: "Risk level is required",
  }),
  necessaryConditions: z.string().optional(),
  treatmentInterventions: z
    .array(z.string())
    .min(1, "Select at least one intervention"),
  otherIntervention: z.string().optional(),
  interventionExplanation: stringValidation(
    "Treatment explanation is required",
  ),
  emotionalResponse: z.enum(emotionalResponses, {
    required_error: "Emotional response is required",
  }),
  behavioralResponse: z.enum(behavioralResponses, {
    required_error: "Behavioral response is required",
  }),
  overallFeedback: z.enum(overallFeedback, {
    required_error: "Overall feedback is required",
  }),
  studentResponseExplanation: stringValidation(
    "Student response explanation is required",
  ),
  followUpPlan: z.object({
    isGroupSession: z.boolean(),
    explanation: stringValidation("Follow-up plan explanation is required"),
  }),
});

type CaseReportFormValues = z.infer<typeof CaseReportSchema>;

export default function CaseNotesForm({
  children,
  clinicalCase,
}: {
  children: React.ReactNode;
  clinicalCase: ClinicalCases;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [showNecessaryConditions, setShowNecessaryConditions] = useState(false);
  const [hasExistingNotes, setHasExistingNotes] = useState(false);

  const form = useForm<CaseReportFormValues>({
    resolver: zodResolver(CaseReportSchema),
    defaultValues: {
      presentingIssues: "",
      orsAssessment: "",
      riskLevel: "no",
      necessaryConditions: "",
      treatmentInterventions: [],
      otherIntervention: "",
      interventionExplanation: "",
      emotionalResponse: "Positive",
      behavioralResponse: "Commitment to Change",
      overallFeedback: "Positive",
      studentResponseExplanation: "",
      followUpPlan: {
        isGroupSession: false,
        explanation: "",
      },
      sessionId: "",
    },
  });

  useEffect(() => {
    const sessionId = form.watch("sessionId");
    if (!sessionId) return;

    const existingNote = clinicalCase.clinicalCaseNotes?.find(
      (note) => note.sessionId === sessionId,
    );

    setHasExistingNotes(!!existingNote);

    if (existingNote) {
      form.reset({
        sessionId,
        presentingIssues: existingNote.presentingIssues,
        orsAssessment: existingNote.orsAssessment.toString(),
        riskLevel: existingNote.riskLevel as (typeof riskLevels)[number],
        necessaryConditions: existingNote.necessaryConditions,
        treatmentInterventions: existingNote.treatmentInterventions,
        otherIntervention: existingNote.otherIntervention,
        interventionExplanation: existingNote.interventionExplanation,
        emotionalResponse:
          existingNote.emotionalResponse as (typeof emotionalResponses)[number],
        behavioralResponse:
          existingNote.behavioralResponse as (typeof behavioralResponses)[number],
        overallFeedback:
          existingNote.overallFeedback as (typeof overallFeedback)[number],
        studentResponseExplanation: existingNote.studentResponseExplanations,
        followUpPlan: {
          isGroupSession: existingNote.followUpPlan === "GROUP",
          explanation: existingNote.followUpPlanExplanation,
        },
      });

      setShowOtherInput(existingNote.treatmentInterventions.includes("Other"));
      setShowNecessaryConditions(existingNote.riskLevel !== "no");
    } else {
      form.reset({
        sessionId,
        presentingIssues: "",
        orsAssessment: "",
        riskLevel: "no",
        necessaryConditions: "",
        treatmentInterventions: [],
        otherIntervention: "",
        interventionExplanation: "",
        emotionalResponse: "Positive",
        behavioralResponse: "Commitment to Change",
        overallFeedback: "Positive",
        studentResponseExplanation: "",
        followUpPlan: {
          isGroupSession: false,
          explanation: "",
        },
      });
      setShowOtherInput(false);
      setShowNecessaryConditions(false);
    }
  }, [form.watch("sessionId"), clinicalCase.clinicalCaseNotes]);

  const onSubmit = async (data: CaseReportFormValues) => {
    try {
      const response = await createClinicalCaseNotes({
        caseId: clinicalCase.id,
        sessionId: data.sessionId,
        followUpPlanExplanation: data.followUpPlan.explanation,
        followUpPlan: data.followUpPlan.isGroupSession ? "GROUP" : "INDIVIDUAL",
        orsAssessment: parseInt(data.orsAssessment),
        interventionExplanation: data.interventionExplanation,
        emotionalResponse: data.emotionalResponse,
        behavioralResponse: data.behavioralResponse,
        overallFeedback: data.overallFeedback,
        studentResponseExplanation: data.studentResponseExplanation,
        presentingIssues: data.presentingIssues,
        riskLevel: data.riskLevel,
        necessaryConditions: data.necessaryConditions || "",
        treatmentInterventions: data.treatmentInterventions,
        otherIntervention: data.otherIntervention || "",
      });
      if (response.success) {
        toast({
          title: "Case report updated successfully",
        });
      } else {
        toast({
          title: "Something went wrong, please try again",
          variant: "destructive",
        });
      }
      setDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Something went wrong, please try again",
        variant: "destructive",
      });
    }
  };

  const watchRiskLevel = form.watch("riskLevel");

  useEffect(() => {
    setShowNecessaryConditions(watchRiskLevel !== "no");
  }, [watchRiskLevel]);

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] max-w-[60vw] overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>Case Notes</h2>
          {hasExistingNotes && (
            <p className="text-sm text-muted-foreground">
              This session already has notes and cannot be edited
            </p>
          )}
        </DialogHeader>
        <DialogAlertWidget label={clinicalCase.pseudonym} separator={true} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sessionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Select session
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select session" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clinicalCase.clinicalSessionAttendance?.map(
                        (session) => {
                          const hasNotes = clinicalCase.clinicalCaseNotes?.some(
                            (note) => note.sessionId === session.id,
                          );
                          return (
                            <SelectItem key={session.id} value={session.id}>
                              <div className="flex w-full items-center justify-between">
                                <span>
                                  {session.session} -{" "}
                                  {format(
                                    new Date(session.date),
                                    "dd MMM yyyy",
                                  )}
                                </span>
                                {hasNotes && (
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    (View only)
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        },
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="presentingIssues"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Presenting Issues on this session
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      disabled={hasExistingNotes}
                      className={hasExistingNotes ? "bg-muted" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orsAssessment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ORS Assessment
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="riskLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Risk Level Assignment
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <div className="space-y-2">
                    {riskLevels.map((level) => (
                      <FormField
                        key={level}
                        control={form.control}
                        name="riskLevel"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value === level}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange(level);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal capitalize">
                              {level}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showNecessaryConditions && (
              <FormField
                control={form.control}
                name="necessaryConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Necessary Conditions</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="treatmentInterventions"
              render={() => (
                <FormItem>
                  <FormLabel>
                    Intervention(s)
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <div className="space-y-2">
                    {treatmentInterventions.map((intervention) => (
                      <FormField
                        key={intervention}
                        control={form.control}
                        name="treatmentInterventions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(intervention)}
                                onCheckedChange={(checked) => {
                                  const value = intervention;
                                  if (value === "Other") {
                                    setShowOtherInput(checked === true);
                                  }
                                  return checked === true
                                    ? field.onChange([...field.value, value])
                                    : field.onChange(
                                        field.value?.filter(
                                          (val) => val !== value,
                                        ),
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {intervention}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showOtherInput && (
              <FormField
                control={form.control}
                name="otherIntervention"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Other Intervention
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="interventionExplanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Intervention Explanation
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="border-b border-gray-200 pb-2 font-semibold">
                Student Response
              </h3>

              <div className="flex gap-8">
                <FormField
                  control={form.control}
                  name="emotionalResponse"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Emotional Responses
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="space-y-2">
                        {emotionalResponses.map((response) => (
                          <FormField
                            key={response}
                            control={form.control}
                            name="emotionalResponse"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value === response}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange(response);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {response}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="behavioralResponse"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Behavioral Responses
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="space-y-2">
                        {behavioralResponses.map((response) => (
                          <FormField
                            key={response}
                            control={form.control}
                            name="behavioralResponse"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value === response}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange(response);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {response}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="overallFeedback"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Overall Session Feedback
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="space-y-2">
                        {overallFeedback.map((feedback) => (
                          <FormField
                            key={feedback}
                            control={form.control}
                            name="overallFeedback"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value === feedback}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange(feedback);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {feedback}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="studentResponseExplanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Student Response Explanation
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Explain the student's response to the session..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="followUpPlan.isGroupSession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan for Follow-up Session Type</FormLabel>
                    <div className="flex space-x-4">
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={!field.value}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange(false);
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Individual Session
                        </FormLabel>
                      </FormItem>

                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange(true);
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Group Session
                        </FormLabel>
                      </FormItem>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="followUpPlan.explanation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Explanation
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Enter explanation for follow-up plan..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setDialogOpen(false)}
              >
                {hasExistingNotes ? "Close" : "Cancel"}
              </Button>
              {!hasExistingNotes && (
                <Button
                  variant="brand"
                  type="submit"
                  loading={form.formState.isSubmitting}
                  disabled={form.formState.isSubmitting}
                >
                  Submit
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
