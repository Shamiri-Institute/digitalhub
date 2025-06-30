import { DropoutStudentSchema } from "#/app/(platform)/hc/schemas";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import type { SchoolStudentTableData } from "#/components/common/student/columns";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "#/components/ui/dialog";
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
import { toast } from "#/components/ui/use-toast";
import { dropoutStudent } from "#/lib/actions/student";
import { STUDENT_DROPOUT_REASONS } from "#/lib/app-constants/constants";
import { cn } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

export default function StudentDropoutForm({
  student,
  isOpen,
  setIsOpen,
  children,
}: {
  student: SchoolStudentTableData;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const pathname = usePathname();

  const form = useForm<z.infer<typeof DropoutStudentSchema>>({
    resolver: zodResolver(DropoutStudentSchema),
    defaultValues: {
      studentId: student.id,
      mode: student.droppedOut ? "undo" : "dropout",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        studentId: student.id,
        mode: student.droppedOut ? "undo" : "dropout",
      });
    }
  }, [student, isOpen]);

  async function confirmSubmit() {
    setLoading(true);
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
    form.reset();

    await revalidatePageAction(pathname).then(() => {
      if (form.getValues("mode") === "dropout") {
        setConfirmDialog(false);
      } else {
        setIsOpen(false);
      }
      setLoading(false);
    });
  }

  const onSubmit = () => {
    if (form.getValues("mode") === "dropout") {
      setIsOpen(false);
      setConfirmDialog(true);
    } else {
      confirmSubmit();
    }
  };

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-5 text-base font-medium leading-6">
          <DialogHeader>
            {student.droppedOut ? (
              <h2 className="text-lg font-bold">Undo student drop out?</h2>
            ) : (
              <h2 className="text-lg font-bold">Drop out student</h2>
            )}
          </DialogHeader>
          {children}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={student.droppedOut ? "brand" : "destructive"}
                type="submit"
                disabled={student.droppedOut ? loading : form.formState.isSubmitting}
                loading={student.droppedOut ? loading : form.formState.isSubmitting}
              >
                {student.droppedOut ? "Undo" : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent className="p-5">
          <DialogHeader>
            <h2 className="text-lg font-bold">Confirm drop out</h2>
          </DialogHeader>
          {children}
          <div className="space-y-4">
            <h3>Are you sure?</h3>
            <Alert variant="destructive">
              <AlertTitle className="flex gap-2">
                <InfoIcon className="h-4 w-4 shrink-0" />
                Once this change has been made it is irreversible and will need you to contact
                support in order to modify. Please be sure of your action before you confirm.
              </AlertTitle>
            </Alert>
          </div>
          <Separator />
          <DialogFooter className="flex justify-end">
            <Button
              className="text-shamiri-light-red hover:bg-red-bg"
              variant="ghost"
              onClick={() => {
                setConfirmDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading}
              loading={loading}
              onClick={() => {
                confirmSubmit();
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
