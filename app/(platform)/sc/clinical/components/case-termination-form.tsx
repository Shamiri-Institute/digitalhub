"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { type ClinicalCases, terminateClinicalCase } from "#/app/(platform)/sc/clinical/action";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "#/components/ui/dialog";
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
import { toast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";

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
      error: (issue) => issue.input === undefined ? "Termination reason is required" : undefined
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

  const form = useForm<CaseTerminationFormValues>({
    resolver: zodResolver(CaseTerminationSchema),
    defaultValues: {
      sessionId: "",
      terminationReason: "Student no-show",
      terminationExplanation: "",
    },
  });

  const onSubmit = async (data: CaseTerminationFormValues) => {
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
      <DialogContent className="z-10 max-w-[500px] bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>Terminate Case</h2>
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
                    Termination Session
                    <span className="text-red-500">*</span>
                  </FormLabel>
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
                <FormItem>
                  <FormLabel>
                    Termination Reason
                    <span className="text-red-500">*</span>
                  </FormLabel>
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
                <FormItem>
                  <FormLabel>
                    Termination Explanation
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Explain the reason for termination..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4">
              <Button variant="ghost" type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="brand"
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={form.formState.isSubmitting}
              >
                Terminate Case
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
