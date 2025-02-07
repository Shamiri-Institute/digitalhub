"use client";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { SessionReportType } from "#/app/(platform)/sc/reporting/school-reports/session/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { submitQualitativeFeedback } from "#/lib/actions/session/session";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const QualitativeFeedbackSchema = z.object({
  notes: stringValidation("Please enter your notes"),
});

export default function ViewEditQualitativeFeedback({
  children,
  sessionReport,
  action = "view",
}: {
  children: React.ReactNode;
  sessionReport: SessionReportType["session"][number];
  action: "view" | "edit";
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof QualitativeFeedbackSchema>>({
    resolver: zodResolver(QualitativeFeedbackSchema),
    defaultValues: {
      notes: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof QualitativeFeedbackSchema>) => {
    const response = await submitQualitativeFeedback({
      notes: data.notes,
      sessionId: sessionReport.session,
    });
    if (!response.success) {
      toast({
        variant: "destructive",
        title: "Submission error",
        description:
          response.message ??
          "Something went wrong during submission, please try again",
      });
      return;
    }

    toast({
      variant: "default",
      title: "Success",
      description: "Successfully submitted qualitative feedback",
    });

    form.reset();
    setDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>{`${action === "view" ? "View" : "Edit"} school report`}</h2>
        </DialogHeader>
        <DialogAlertWidget
          label={`${action === "view" ? "View" : "Edit"} ${sessionReport.schoolName} - ${sessionReport.session} - ${sessionReport.date}`}
        />
        <div className="min-w-max space-y-2 overflow-x-auto overflow-y-scroll">
          <div className="flex flex-col items-start gap-2">
            <p className="text-shamiri-black">
              Student behaviour (1 unacceptable to 5 outstanding)
            </p>
            <DataTableRatingStars rating={sessionReport.avgStudentBehaviour} />
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="text-shamiri-black">
              Admin support (1 unacceptable to 5 outstanding)
            </p>
            <DataTableRatingStars rating={sessionReport.avgAdminSupport} />
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="text-shamiri-black">
              Workload (1 unacceptable to 5 outstanding)
            </p>
            <DataTableRatingStars rating={sessionReport.avgWorkload} />
          </div>
        </div>
        <Separator />
        {sessionReport.sessionNotes.map((note) => (
          <div key={note.sessionNoteId}>
            <p className="capitalize">{note.kind.replace("-", " ")}</p>
            <Textarea
              value={note.content}
              rows={5}
              disabled={action === "view"}
            />
          </div>
        ))}

        <Separator />
        <p className="text-shamiri-black"> Notes</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add your notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder=""
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator className="my-4" />
            {sessionReport.sessionComments.map((comment) => (
              <div key={comment.sessionCommentId}>
                <div>
                  <p className="text-shamiri-text-grey">
                    {format(comment.date, "dd MMM yyyy | hh.mm a")}
                  </p>
                </div>
                <p className="text-shamiri-text-grey">{comment.name}</p>
                <p className="text-shamiri-text-grey">{comment.content}</p>
              </div>
            ))}
            <DialogFooter>
              <Button
                variant="ghost"
                className="text-base font-semibold leading-6 text-shamiri-red"
                onClick={() => {
                  form.reset();
                  setDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={form.formState.isSubmitting}
              >
                Add notes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
