"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { dropoutStudentWithReason } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { StudentWithFellow } from "#/types/prisma";

const FormSchema = z.object({
  reason: z.string({
    required_error: "Please enter the drop out reason",
  }),
});

export function StudentDropoutDialog({
  student,
  children,
}: {
  student: StudentWithFellow;
  children: React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const response = await dropoutStudentWithReason(
      student.visibleId,
      student.school.visibleId,
      student.fellow.visibleId,
      data.reason,
    );
    if (response?.error) {
      toast({
        variant: "destructive",
        title: response?.error,
      });
      return;
    }

    if (response) {
      toast({
        title: `Dropped out ${student.studentName}`,
      });

      setDialogOpen(false);

      form.reset();
    } else {
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium">
                  Drop out {student.studentName}
                </span>
              </div>
            </DialogHeader>
            <Separator />
            <div className="my-6 space-y-6">
              <div className="px-6">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="emails">Reason</Label>
                      <Textarea
                        id="reason"
                        name="reason"
                        onChange={field.onChange}
                        defaultValue={field.value}
                        placeholder="e.g. Student has entered the workforce"
                        className="mt-1.5 resize-none bg-card"
                      />
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 pb-6">
              <Button variant="destructive" type="submit" className="w-full">
                Drop out {student.studentName}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
