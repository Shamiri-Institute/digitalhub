"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addNote } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";

const FormSchema = z.object({
  content: z.string({
      error: (issue) => issue.input === undefined ? "Please enter the note" : undefined
}),
});

export function AddNoteDialog({
  revalidatePath,
  sessionId,
  supervisorId,
  children,
}: {
  revalidatePath: string;
  sessionId: string;
  supervisorId: string;
  children: React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const { success } = await addNote({
      sessionId,
      supervisorId,
      content: data.content,
    });
    if (success) {
      toast({
        title: "Note added successfully",
      });
      window.location.href = revalidatePath;
    } else {
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="overflow-hidden text-ellipsis">
            <div className="my-6 space-y-6">
              <div className="px-6">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="emails">Add note</Label>
                      <Textarea
                        id="content"
                        name="content"
                        onChange={field.onChange}
                        defaultValue={field.value}
                        placeholder="Write here..."
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
