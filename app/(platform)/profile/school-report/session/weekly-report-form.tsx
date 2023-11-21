"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { FormSchema } from "./page";

export function WeeklyReportForm({
  pointSupervisor,
}: {
  pointSupervisor: Prisma.SupervisorGetPayload<{}>;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      positiveHighlight: "",
      reportedChallenge: "",
      recommendations: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    // todo: submit the form (weekly report)
    toast({ title: "Report submitted successfully" });
  }

  return (
    <div className="px-6">
      <div className="my-3 text-center text-sm font-medium text-muted-foreground">
        <h3>{pointSupervisor.supervisorName}'s Review</h3>
      </div>
      <Form {...form}>
        <form
          id="weeklyReportForm"
          onSubmit={form.handleSubmit(onSubmit)}
          className="overflow-hidden text-ellipsis px-1"
        >
          <FormField
            control={form.control}
            name="positiveHighlight"
            render={({ field }) => (
              <div className="mt-3 grid w-full gap-1.5">
                <Label htmlFor="emails">Positive Highlights</Label>
                <Textarea
                  id="positiveHighlight"
                  name="positiveHighlight"
                  onChange={field.onChange}
                  defaultValue={field.value}
                  placeholder="Write here..."
                  className="mt-1.5 resize-none bg-card"
                  rows={10}
                />
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="reportedChallenge"
            render={({ field }) => (
              <div className="mt-6 grid w-full gap-1.5">
                <Label htmlFor="emails">Reported Challenges</Label>
                <Textarea
                  id="reportedChallenge"
                  name="reportedChallenge"
                  onChange={field.onChange}
                  defaultValue={field.value}
                  placeholder="Write here..."
                  className="mt-1.5 resize-none bg-card"
                  rows={10}
                />
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="recommendations"
            render={({ field }) => (
              <div className="mt-6 grid w-full gap-1.5">
                <Label htmlFor="emails">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  onChange={field.onChange}
                  defaultValue={field.value}
                  placeholder="Write here..."
                  className="mt-1.5 resize-none bg-card"
                  rows={10}
                />
              </div>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
