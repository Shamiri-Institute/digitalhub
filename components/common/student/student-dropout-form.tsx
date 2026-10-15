import { type Dispatch, type SetStateAction, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { DropoutStudentSchema } from "#/app/(platform)/hc/schemas";
import type { SchoolStudentTableData } from "#/components/common/student/columns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast, toastOnError, toastOnFailure } from "#/components/ui/use-toast";
import { dropoutStudent } from "#/lib/actions/student";
import { STUDENT_DROPOUT_REASONS } from "#/lib/app-constants/constants";
import { cn } from "#/lib/utils";
import { DropoutConfirmStep, type StepProps } from "#/components/common/dropout-confirm-step";
import { zodResolver } from "#/lib/zod-resolver";

type Step = "form" | "confirm";
type Props = {
  student: SchoolStudentTableData;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
};

export default function StudentDropoutForm({ student, isOpen, setIsOpen, children }: Props) {
  const [step, setStep] = useState<Step>("form");
  function close() {
    setStep("form");
    setIsOpen(false);
  }
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : close())}>
      <DialogContent className={step === "form" ? "p-5 text-base font-medium leading-6" : "p-5"}>
        <StudentDropoutSteps student={student} step={step} setStep={setStep} close={close}>
          {children}
        </StudentDropoutSteps>
      </DialogContent>
    </Dialog>
  );
}

function StudentDropoutSteps({
  student,
  children,
  step,
  setStep,
  close,
}: {
  student: SchoolStudentTableData;
  children: React.ReactNode;
} & StepProps<Step>) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof DropoutStudentSchema>>({
    resolver: zodResolver(DropoutStudentSchema),
    defaultValues: {
      studentId: student.id,
      mode: student.droppedOut ? "undo" : "dropout",
    },
  });

  function confirmSubmit() {
    startTransition(() =>
      toastOnFailure(async () => {
        const response = await dropoutStudent(form.getValues());
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

  const onSubmit = () => {
    if (form.getValues("mode") === "dropout") {
      setStep("confirm");
    } else {
      confirmSubmit();
    }
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
        <DialogTitle className="text-lg font-bold">
          {student.droppedOut ? "Undo student drop out?" : "Drop out student"}
        </DialogTitle>
      </DialogHeader>
      {children}
      <form onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-5">
        {!student.droppedOut && (
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
                    {STUDENT_DROPOUT_REASONS.map((reason) => (
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
        )}
        {!student.droppedOut && <Separator />}
        <DialogFooter className="flex justify-end">
          <Button
            className={cn(
              student.droppedOut
                ? "text-shamiri-new-blue hover:bg-blue-bg"
                : "text-shamiri-light-red hover:bg-red-bg",
            )}
            variant="ghost"
            type="button"
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            variant={student.droppedOut ? "brand" : "destructive"}
            type="submit"
            disabled={isPending}
            loading={isPending}
          >
            {student.droppedOut ? "Undo" : "Submit"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
