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
import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { submitOverallFellowReport } from "../actions";
import { OverallFellowSchema } from "../schema";

type Props = {
  children: React.ReactNode;
  fellowName: string;
  fellowId: string;
  supervisorId: string;
  previousReportingNotes?: (Prisma.FellowReportingNotesGetPayload<{}> & {
    supervisor: Prisma.SupervisorGetPayload<{}>;
  })[];
};

const InputSchema = OverallFellowSchema.pick({
  fellowBehaviourNotes: true,
  programDeliveryNotes: true,
  dressingAndGroomingNotes: true,
  attendanceNotes: true,
});

export default function FellowEvaluationForm(props: Props) {
  const [open, setDialogOpen] = React.useState<boolean>(false);

  const form = useForm<z.infer<typeof InputSchema>>({
    resolver: zodResolver(InputSchema),
    defaultValues: {
      fellowBehaviourNotes: "",
      programDeliveryNotes: "",
      dressingAndGroomingNotes: "",
      attendanceNotes: "",
    },
  });

  async function onSubmit(data: z.infer<typeof InputSchema>) {
    const result = await submitOverallFellowReport({
      ...data,
      fellowId: props.fellowId,
      supervisorId: props.supervisorId,
    });

    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Form submission error",
        description: `Failed to submit overall fellow report for ${props.fellowName}`,
      });
      return;
    }

    toast({
      variant: "default",
      title: "Successful submission",
      description: `Successfully added overall fellow report for ${props.fellowName}`,
    });
    form.reset();
    setDialogOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="mb-4">
              <h2 className="text-brand text-2xl">{props.fellowName} Overall Report</h2>
            </DialogHeader>
            <Separator />
            <div className="space-y-6 mt-4">
              {/*TODO: <div>Chart goes here</div>*/}
              <div>
                {props.previousReportingNotes?.length} Reporting Note
                {props.previousReportingNotes?.length === 1 ? "" : "s"}
              </div>
              <div>
                <div className="flex gap-4">
                  <p>Fellow Behaviour</p>
                  <div></div>
                </div>
                <FormField
                  control={form.control}
                  name="fellowBehaviourNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <div className="flex gap-4">
                  <p>Program delivery</p>
                </div>
                <FormField
                  control={form.control}
                  name="programDeliveryNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <p>Dressing and grooming</p>
                <FormField
                  control={form.control}
                  name="dressingAndGroomingNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <p>Attendance</p>
                <FormField
                  control={form.control}
                  name="attendanceNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <Button type="submit" variant="brand" className="mt-6 w-full">
              Save
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
