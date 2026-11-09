"use client";

import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { type ClinicalCases, terminateClinicalCase } from "#/app/(platform)/sc/clinical/action";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
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

const terminationReasons = [
  "Student no-show",
  "Student refused to return to sessions",
  "Student absence (suspension, expulsion, fees issue etc)",
  "Mutual termination after outcome achievement",
  "Mutual termination after referral",
] as const;

const CaseTerminationSchema = z.object({
  sessionId: stringValidation("Session is required"),
  terminationReason: z.enum(terminationReasons, {
    error: (issue) => (issue.input === undefined ? "Termination reason is required" : undefined),
  }),
  terminationExplanation: stringValidation("Termination explanation is required"),
});

type CaseTerminationFormValues = z.infer<typeof CaseTerminationSchema>;

export default function CaseTerminationForm({
  children,
  clinicalCase,
}: {
  children: React.ReactNode;
  clinicalCase: ClinicalCases;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-w-[500px] bg-white p-5">
        <DialogHeader className="bg-white">
          <DialogTitle>Terminate Case</DialogTitle>
        </DialogHeader>
        <DialogAlertWidget label={clinicalCase.pseudonym} separator={true} />
        <CaseTerminationFields clinicalCase={clinicalCase} close={() => setDialogOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CaseTerminationFields({
  clinicalCase,
  close,
}: {
  clinicalCase: ClinicalCases;
  close: () => void;
}) {
  const { isSaving, save } = useDialogSave();
  const form = useForm<CaseTerminationFormValues>({
    resolver: zodResolver(CaseTerminationSchema),
    defaultValues: {
      sessionId: "",
      terminationReason: "Student no-show",
      terminationExplanation: "",
    },
  });

  const onSubmit = (data: CaseTerminationFormValues) => {
    save(async () => {
      try {
        const response = await terminateClinicalCase({
          caseId: clinicalCase.id,
          sessionId: data.sessionId,
          terminationReason: data.terminationReason,
          terminationReasonExplanation: data.terminationExplanation,
        });

        if (response.success) {
          toast({
            title: "Case terminated successfully",
          });
        } else {
          toast({
            title: "Something went wrong, please try again",
            variant: "destructive",
          });
        }
        close();
      } catch {
        toast({
          title: "Something went wrong, please try again",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-4">
        <FormField
          control={form.control}
          name="sessionId"
          render={({ field }) => (
            <FormItem required>
              <FormLabel>Termination Session</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clinicalCase.clinicalSessionAttendance?.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.session} - {format(new Date(session.date), "dd MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="terminationReason"
          render={({ field }) => (
            <FormItem required>
              <FormLabel>Termination Reason</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select termination reason" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {terminationReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="terminationExplanation"
          render={({ field }) => (
            <FormItem required>
              <FormLabel>Termination Explanation</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} placeholder="Explain the reason for termination..." />
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
            Terminate Case
          </Button>
        </div>
      </form>
    </Form>
  );
}
