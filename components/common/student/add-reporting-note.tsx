"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { StudentReportingNotesSchema } from "#/app/(platform)/hc/schemas";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import type { SchoolStudentTableData } from "#/components/common/student/columns";
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
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { submitStudentReportingNotes } from "#/lib/actions/student";

export function AddReportingNote({
  isOpen,
  setIsOpen,
  student,
  children,
}: {
  student: SchoolStudentTableData;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const form = useForm<z.infer<typeof StudentReportingNotesSchema>>({
    resolver: zodResolver(StudentReportingNotesSchema),
    defaultValues: {
      studentId: student.id,
    },
  });

  const onSubmit = async (data: z.infer<typeof StudentReportingNotesSchema>) => {
    const response = await submitStudentReportingNotes(data);
    if (!response.success) {
      toast({
        description: response.message ?? "Something went wrong during submission, please try again",
      });
      return;
    }
    toast({
      description: response.message,
    });

    await revalidatePageAction(pathname);
    setIsOpen(false);
  };

  useEffect(() => {
    form.reset();
  }, [isOpen, form]);

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="lg:w-2/5 lg:max-w-none">
          <DialogHeader>
            <h2 className="text-lg font-bold">Add reporting note</h2>
          </DialogHeader>
          {children}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Report incident <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="" className="resize-none" rows={6} {...field} />
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
                  <Input id="studentId" name="studentId" type="hidden" value={field.value} />
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
