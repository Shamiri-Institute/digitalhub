"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { type ClinicalCases, createTreatmentPlan } from "#/app/(platform)/sc/clinical/action";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogClose,
  useDialogSave,
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
import { toast, toastOnError } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";

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
  currentOrsScore: z
    .string()
    .refine((value) => Number.isInteger(Number(value)), "Enter a whole number")
    .optional(),
  plannedSessions: stringValidation("Number of planned sessions is required").refine(
    (value) => Number.isInteger(Number(value)),
    "Enter a whole number",
  ),
  sessionFrequency: stringValidation("Session frequency is required"),
  treatmentInterventions: z.array(z.string()).min(1, "Select at least one intervention"),
  otherIntervention: z.string().optional(),
  interventionExplanation: stringValidation("Treatment explanation is required"),
});

type TreatmentPlanFormValues = z.infer<typeof TreatmentPlanSchema>;

export default function TreatmentPlanForm({
  children,
  clinicalCase,
  role,
}: {
  children: React.ReactNode;
  clinicalCase: ClinicalCases;
  role: "CLINICAL_LEAD" | "SUPERVISOR";
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] max-w-[60vw] overflow-x-auto bg-white p-5">
        <TreatmentPlanFields
          clinicalCase={clinicalCase}
          role={role}
          close={() => setDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TreatmentPlanFields({
  clinicalCase,
  role,
  close,
}: {
  clinicalCase: ClinicalCases;
  role: "CLINICAL_LEAD" | "SUPERVISOR";
  close: () => void;
}) {
  const { isSaving, save } = useDialogSave();
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

  const onSubmit = (data: TreatmentPlanFormValues) => {
    save(async () => {
      const responese = await createTreatmentPlan({
        caseId: clinicalCase.id,
        role,
        currentOrsScore: data.currentOrsScore ? Number.parseInt(data.currentOrsScore, 10) : 0,
        plannedSessions: Number.parseInt(data.plannedSessions, 10),
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
      close();
    });
  };

  return (
    <>
      <DialogHeader className="bg-white">
        <DialogTitle>Treatment Plan</DialogTitle>
      </DialogHeader>
      <DialogAlertWidget label={clinicalCase.pseudonym} separator={true} />
      <Form {...form}>
        <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-4">
          <FormField
            control={form.control}
            name="currentOrsScore"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current ORS Score</FormLabel>
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
              <FormItem required>
                <FormLabel>Planned Sessions</FormLabel>
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
              <FormItem required>
                <FormLabel>Session Frequency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="once_week">Once a week</SelectItem>
                    <SelectItem value="twice_week">Twice a week</SelectItem>
                    <SelectItem value="biweekly">Once every two weeks</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="treatmentInterventions"
            render={() => (
              <FormItem required>
                <FormLabel>Planned Treatment Interventions</FormLabel>
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
                                  : field.onChange(field.value?.filter((val) => val !== value));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">{intervention}</FormLabel>
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
                <FormItem required>
                  <FormLabel>Other Intervention</FormLabel>
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
              <FormItem required>
                <FormLabel>Treatment Intervention Explanation</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-4">
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button variant="brand" type="submit" loading={isSaving} disabled={isSaving}>
              Submit
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
