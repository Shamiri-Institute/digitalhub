"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  ClinicalCases,
  updateTreatmentPlan,
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

const TreatmentPlanSchema = z.object({
  currentOrsScore: stringValidation("Current ORS score is required"),
  plannedSessions: stringValidation("Number of planned sessions is required"),
  sessionFrequency: stringValidation("Session frequency is required"),
  treatmentInterventions: z
    .array(z.string())
    .min(1, "Select at least one intervention"),
  otherIntervention: z.string().optional(),
  interventionExplanation: stringValidation(
    "Treatment explanation is required",
  ),
});

type TreatmentPlanFormValues = z.infer<typeof TreatmentPlanSchema>;

export default function TreatmentPlanForm({
  children,
  clinicalCase,
}: {
  children: React.ReactNode;
  clinicalCase: ClinicalCases;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);
  const [showOtherInput, setShowOtherInput] = useState(false);

  const form = useForm<TreatmentPlanFormValues>({
    resolver: zodResolver(TreatmentPlanSchema),
    defaultValues: {
      currentOrsScore: "",
      plannedSessions: "",
      sessionFrequency: "",
      treatmentInterventions: [],
      otherIntervention: "",
      interventionExplanation: "",
    },
  });

  const onSubmit = async (data: TreatmentPlanFormValues) => {
    try {
      const responese = await updateTreatmentPlan({
        caseId: clinicalCase.id,
        currentOrsScore: parseInt(data.currentOrsScore),
        plannedSessions: parseInt(data.plannedSessions),
        sessionFrequency: data.sessionFrequency,
        treatmentInterventions: data.treatmentInterventions,
        otherIntervention: data.otherIntervention,
        interventionExplanation: data.interventionExplanation,
      });
      if (responese.success) {
        toast({
          title: "Treatment plan updated successfully",
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

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] max-w-[60vw] overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>Treatment Plan</h2>
        </DialogHeader>
        <DialogAlertWidget label={clinicalCase.pseudonym} separator={true} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentOrsScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Current ORS Score
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
              name="plannedSessions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Planned Sessions
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
              name="sessionFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Session Frequency
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once_week">Once a week</SelectItem>
                        <SelectItem value="twice_week">Twice a week</SelectItem>
                        <SelectItem value="biweekly">
                          Once every two weeks
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="treatmentInterventions"
              render={() => (
                <FormItem>
                  <FormLabel>
                    Planned Treatment Interventions
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
                    Treatment Intervention Explanation
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={form.formState.isSubmitting}
              >
                Submit
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
