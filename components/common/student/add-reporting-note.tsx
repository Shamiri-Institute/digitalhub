"use client";

import { StudentReportingNotesSchema } from "#/app/(platform)/hc/schemas";
import { SchoolStudentTableData } from "#/app/(platform)/hc/schools/[visibleId]/students/components/columns";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { submitStudentReportingNotes } from "#/lib/actions/student";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname } from "next/navigation";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function AddReportingNote({
  isOpen,
  setIsOpen,
  student,
}: {
  student: SchoolStudentTableData;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const pathname = usePathname();

  const form = useForm<z.infer<typeof StudentReportingNotesSchema>>({
    resolver: zodResolver(StudentReportingNotesSchema),
    defaultValues: {
      studentId: student.id,
    },
  });

  const onSubmit = async (
    data: z.infer<typeof StudentReportingNotesSchema>,
  ) => {
    const response = await submitStudentReportingNotes(data);
    if (!response.success) {
      toast({
        description:
          response.message ??
          "Something went wrong during submission, please try again",
      });
      return;
    } else {
      toast({
        description: response.message,
      });
    }

    await revalidatePageAction(pathname);
    setIsOpen(false);
  };

  useEffect(() => {
    form.reset();
  }, [isOpen, form]);

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-2/5 max-w-none">
          <DialogHeader>
            <h2 className="text-lg font-bold">Add reporting note</h2>
          </DialogHeader>
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>{student.studentName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>{student.school?.schoolName}</span>
            </div>
          </DialogAlertWidget>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Report incident{" "}
                    <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder=""
                      className="resize-none"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <Input
                    id="studentId"
                    name="studentId"
                    type="hidden"
                    value={field.value}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button
                className="text-shamiri-new-blue hover:bg-blue-bg"
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                }}
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
