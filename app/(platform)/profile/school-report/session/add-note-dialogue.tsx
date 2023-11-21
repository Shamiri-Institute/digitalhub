"use client";

import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z.object({
  note: z.string({
    required_error: "Please enter the drop out reason",
  }),
});

export function AddNoteDialog({ children }: { children: React.ReactNode }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    // const response = await dropoutStudentWithReason(
    //   student.visibleId,
    //   student.school.visibleId,
    //   student.fellow.visibleId,
    //   data.reason,
    // );
    // if (response?.error) {
    //   toast({
    //     variant: "destructive",
    //     title: response?.error,
    //   });
    //   return;
    // }

    // if (response) {
    //   toast({
    //     title: `Dropped out ${student.studentName}`,
    //   });

    //   setDialogOpen(false);

    //   form.reset();
    // } else {
    toast({
      variant: "destructive",
      title: "Something went wrong",
    });
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
            <div className="my-6 space-y-6">
              <div className="px-6">
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="emails">Add note</Label>
                      <Textarea
                        id="note"
                        name="note"
                        onChange={field.onChange}
                        defaultValue={field.value}
                        placeholder="Add note, write here..."
                        className="mt-1.5 resize-none bg-card"
                      />
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 pb-6">
              <Button variant="brand" type="submit" className="w-full">
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
