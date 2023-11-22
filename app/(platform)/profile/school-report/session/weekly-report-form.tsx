"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { revalidateFromClient, saveReport } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { useToast } from "#/components/ui/use-toast";

const FormSchema = z.object({
  positiveHighlights: z.string({
    required_error: "Please enter the positive highlights.",
  }),
  reportedChallenges: z.string({
    required_error: "Please enter the reported challenges.",
  }),
  recommendations: z.string({
    required_error: "Please enter the recommendations.",
  }),
});

export function WeeklyReportForm({
  revalidatePath,
  sessionId,
  supervisorId,
  pointSupervisor,
  notes,
}: {
  revalidatePath: string;
  sessionId: string;
  supervisorId: string;
  pointSupervisor: Prisma.SupervisorGetPayload<{}>;
  notes: Prisma.InterventionSessionNoteGetPayload<{}>[];
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      positiveHighlights:
        notes.find((note) => note.kind === "positive-highlights")?.content ??
        "",
      reportedChallenges:
        notes.find((note) => note.kind === "reported-challenges")?.content ??
        "",
      recommendations:
        notes.find((note) => note.kind === "recommendations")?.content ?? "",
    },
  });

  const { toast } = useToast();

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const { success } = await saveReport({
      sessionId,
      supervisorId,
      positiveHighlights: data.positiveHighlights,
      reportedChallenges: data.reportedChallenges,
      recommendations: data.recommendations,
    });

    if (success) {
      toast({ title: `Point supervisor report saved` });
      revalidateFromClient(revalidatePath);
    } else {
      toast({
        variant: "destructive",
        title: `Point supervisor report failed to save`,
      });
    }
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
            name="positiveHighlights"
            render={({ field }) => (
              <div className="mt-3 grid w-full gap-1.5">
                <Label htmlFor="emails">Positive Highlights</Label>
                <Textarea
                  id="positiveHighlights"
                  name="positiveHighlights"
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
            name="reportedChallenges"
            render={({ field }) => (
              <div className="mt-6 grid w-full gap-1.5">
                <Label htmlFor="emails">Reported Challenges</Label>
                <Textarea
                  id="reportedChallenges"
                  name="reportedChallenges"
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
          <Button
            type="submit"
            className="mt-6 w-full bg-shamiri-blue hover:bg-brand"
          >
            Save Report
          </Button>
        </form>
      </Form>
    </div>
  );
}
