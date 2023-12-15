"use client";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "#/components/ui/form";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { submitReportingNotes } from "../actions";
import { ReportingNotesSchema } from "../schema";

type Props = {
  children: ReactNode;
  fellowId: string;
  supervisorId: string;
  fellowName?: string;
  reportingNotes?: Prisma.FellowReportingNotesGetPayload<{}>;
};

const InputSchema = ReportingNotesSchema.pick({ notes: true });

export default function ReportingNotesForm(props: Props) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof InputSchema>>({
    resolver: zodResolver(InputSchema),
    defaultValues: {
      notes: "",
    },
  });

  async function onSubmit(data: z.infer<typeof InputSchema>) {
    const result = await submitReportingNotes({
      ...data,
      fellowId: props.fellowId,
      supervisorId: props.supervisorId,
    });

    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Form submission error",
        description: `Failed to submit reporting notes for ${props.fellowName}`,
      });
      return;
    }

    toast({
      variant: "default",
      title: "Successful submission",
      description: `Reporting notes have been added for the ${props.fellowName}`,
    });
    form.reset();
    setDialogOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger>{props.children}</DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <h2>Reporting Notes</h2>
            </DialogHeader>
            <Separator />
            {props.reportingNotes?.length ? (
              <div className="my-6">
                {props.reportingNotes.map((n) => (
                  <div>{n.notes}</div>
                ))}
              </div>
            ) : (
              <p>No notes recorded</p>
            )}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="write notes here" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="brand" className="mt-6 w-full">
              Add Reporting Note
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
