"use client";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { SchoolFeedbackType } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import { SessionReportType } from "#/app/(platform)/sc/reporting/school-reports/session/actions";
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
import { Input } from "#/components/ui/input";
import { toast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const ConfirmReversalSchema = z.object({
  name: stringValidation("Please enter your name"),
});

export default function ViewEditSchoolFeedback({
  children,
  feedback,
  action,
}: {
  children: React.ReactNode;
  feedback: SchoolFeedbackType
  action: "view" | "edit"
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof ConfirmReversalSchema>>({
    resolver: zodResolver(ConfirmReversalSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof ConfirmReversalSchema>) => {
    // const response = await submitPaymentReversal({
    //   id: expense.id,
    //   name: data.name,
    // });
    // if (!response.success) {
    //   toast({
    //     variant: "destructive",
    //     title: "Submission error",
    //     description:
    //       response.message ??
    //       "Something went wrong during submission, please try again",
    //   });
    //   return;
    // }

    // toast({
    //   variant: "default",
    //   title: "Success",
    //   description: "Successfully submitted payment reversal",
    // });

    // form.reset();
    // setDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="sticky top-0 z-10 bg-white">
          <h2>{`${action === "view" ? "View" : "Edit"} school feedback`}</h2>
        </DialogHeader>
        <DialogAlertWidget
          label={`${feedback.schoolName}`}
        />
        <div className="min-w-max overflow-x-auto overflow-y-scroll">
          <p>
            {feedback.schoolName}
          </p>
          <p>
            {feedback.studentTeacherSatisfaction}
          </p>

          {/* <div className="px-1">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Type your name to confirm{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder=""
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    loading={form.formState.isSubmitting}
                    disabled={form.formState.isSubmitting}
                  >
                    Submit
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
