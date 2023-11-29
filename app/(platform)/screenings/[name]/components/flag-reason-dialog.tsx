"use client";

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
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z.object({
  reason: z.string({
    required_error: "Please enter the drop out reason",
  }),
});

export function FlagStudentDialog({
  // case,
  children,
}: {
  // case: ;
  children: React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    // TODO: AFTER SUBMITTING, SEND EMAIL TO CLINICAL OPERATIONS TEAM
    // if (response?.error) {
    //   toast({
    //     variant: "destructive",
    //     title: response?.error,
    //   });
    //   return;
    // }
    // if (response) {
    //   toast({
    //     // title: `Dropped out ${student.studentName}`,
    //   });
    //   setDialogOpen(false);
    //   form.reset();
    // } else {
    //   toast({
    //     variant: "destructive",
    //     title: "Something went wrong",
    //   });
    // }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium">
                  Reason for Flagging Clinical Case
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
                        placeholder="e.g. This case needs the police because..."
                        className="mt-1.5 resize-none bg-card"
                      />
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 pb-6">
              <Button variant="brand" type="submit" className="w-full">
                Submit
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
