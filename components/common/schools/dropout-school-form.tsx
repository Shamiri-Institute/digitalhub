"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { dropoutSchool } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import {
  DropoutConfirmStep,
  type StepProps,
  useStepsDialog,
} from "#/components/common/dropout-confirm-step";
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
import { toast, toastOnError, toastOnFailure } from "#/components/ui/use-toast";
import { SCHOOL_DROPOUT_REASONS } from "#/lib/app-constants/constants";
import { zodResolver } from "#/lib/zod-resolver";
import { DropoutSchoolSchema } from "../../../app/(platform)/hc/schemas";
import type { SchoolsTableData } from "./columns";

type Step = "form" | "confirm";

export function DropoutSchool({
  school,
  open,
  setOpen,
}: {
  school: SchoolsTableData | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { onOpenChange, stepProps } = useStepsDialog<Step>("form", setOpen);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeDisabled={stepProps.isPending}
        className={stepProps.step === "form" ? "p-5 text-base font-medium leading-6" : "p-5"}
      >
        <DropoutSchoolSteps school={school} {...stepProps} />
      </DialogContent>
    </Dialog>
  );
}

function DropoutSchoolSteps({
  school,
  step,
  setStep,
  close,
  isPending,
  startTransition,
}: {
  school: SchoolsTableData | null;
} & StepProps<Step>) {
  const [formData, setFormData] = useState<z.infer<typeof DropoutSchoolSchema>>();
  const form = useForm<z.infer<typeof DropoutSchoolSchema>>({
    resolver: zodResolver(DropoutSchoolSchema),
    defaultValues: { schoolId: school?.id },
  });

  function confirmSubmit() {
    if (!formData) return;
    startTransition(() =>
      toastOnFailure(async () => {
        const response = await dropoutSchool(formData.schoolId, formData.dropoutReason);
        if (!response.success) {
          toast({
            description: response.message ?? "Something went wrong, please try again",
          });
          return;
        }

        toast({
          description: response.message,
        });
        close();
      }),
    );
  }

  const onSubmit = (data: z.infer<typeof DropoutSchoolSchema>) => {
    if (!school) {
      return;
    }
    setFormData(data);
    setStep("confirm");
  };

  if (step === "confirm") {
    return (
      <DropoutConfirmStep
        isPending={isPending}
        onCancel={() => {
          form.reset({ schoolId: school?.id });
          setStep("form");
        }}
        onConfirm={confirmSubmit}
      >
        <DialogAlertWidget label={school?.schoolName} />
      </DropoutConfirmStep>
    );
  }

  return (
    <Form {...form}>
      <DialogHeader>
        <DialogTitle>Drop out school</DialogTitle>
      </DialogHeader>
      <DialogAlertWidget label={school?.schoolName} />
      <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-5">
        <FormField
          control={form.control}
          name="dropoutReason"
          render={({ field }) => (
            <FormItem required className="space-y-2">
              <FormLabel>Select reason</FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dropout reason" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SCHOOL_DROPOUT_REASONS.map((reason) => (
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
          name="schoolId"
          render={({ field }) => (
            <FormItem>
              <Input id="schoolId" name="schoolId" type="hidden" value={field.value} />
              <FormMessage />
            </FormItem>
          )}
        />
        <Separator />
        <DialogFooter className="flex justify-end">
          <Button
            className="text-shamiri-light-red hover:bg-red-bg"
            variant="ghost"
            onClick={close}
          >
            Cancel
          </Button>
          <Button variant="destructive" type="submit">
            Submit
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
