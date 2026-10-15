import { type Dispatch, type SetStateAction, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { DropoutSupervisorSchema } from "#/app/(platform)/hc/schemas";
import { dropoutSupervisor } from "#/app/(platform)/hc/supervisors/actions";
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
import { SUPERVISOR_DROP_OUT_REASONS } from "#/lib/app-constants/constants";
import { DropoutConfirmStep, type StepProps } from "#/components/common/dropout-confirm-step";
import { zodResolver } from "#/lib/zod-resolver";

type Step = "form" | "confirm";
type Props = {
  supervisorId?: string;
  children: React.ReactNode;
  dropoutDialog: boolean;
  setDropoutDialog: Dispatch<SetStateAction<boolean>>;
};

export default function DropoutSupervisor({
  supervisorId,
  children,
  dropoutDialog,
  setDropoutDialog,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  function close() {
    setStep("form");
    setDropoutDialog(false);
  }
  return (
    <Dialog open={dropoutDialog} onOpenChange={(open) => (open ? setDropoutDialog(true) : close())}>
      <DialogContent className={step === "form" ? "p-5 text-base font-medium leading-6" : "p-5"}>
        <DropoutSupervisorSteps
          supervisorId={supervisorId}
          step={step}
          setStep={setStep}
          close={close}
        >
          {children}
        </DropoutSupervisorSteps>
      </DialogContent>
    </Dialog>
  );
}

function DropoutSupervisorSteps({
  supervisorId,
  children,
  step,
  setStep,
  close,
}: {
  supervisorId?: string;
  children: React.ReactNode;
} & StepProps<Step>) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<z.infer<typeof DropoutSupervisorSchema>>();

  const form = useForm<z.infer<typeof DropoutSupervisorSchema>>({
    resolver: zodResolver(DropoutSupervisorSchema),
    defaultValues: { supervisorId },
  });

  function confirmSubmit() {
    if (!formData) return;
    startTransition(() =>
      toastOnFailure(async () => {
        const response = await dropoutSupervisor(formData.supervisorId, formData.dropoutReason);
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

  const onSubmit = (data: z.infer<typeof DropoutSupervisorSchema>) => {
    setFormData(data);
    setStep("confirm");
  };

  if (step === "confirm") {
    return (
      <DropoutConfirmStep isPending={isPending} onCancel={close} onConfirm={confirmSubmit}>
        {children}
      </DropoutConfirmStep>
    );
  }

  return (
    <Form {...form}>
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">Drop out supervisor</DialogTitle>
      </DialogHeader>
      {children}
      <form onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-5">
        <FormField
          control={form.control}
          name="dropoutReason"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>
                Select reason <span className="text-shamiri-light-red">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dropout reason" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SUPERVISOR_DROP_OUT_REASONS.map((reason) => (
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
          name="supervisorId"
          render={({ field }) => (
            <FormItem>
              <Input id="supervisorId" name="supervisorId" type="hidden" value={field.value} />
              <FormMessage />
            </FormItem>
          )}
        />
        <Separator />
        <DialogFooter className="flex justify-end">
          <Button
            className="text-shamiri-light-red hover:bg-red-bg"
            variant="ghost"
            type="button"
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
