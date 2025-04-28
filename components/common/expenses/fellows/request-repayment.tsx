"use client";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { useState } from "react";

import { submitRequestRepayment } from "#/app/(platform)/hc/reporting/expenses/fellows/actions";
import { FellowExpenseData } from "#/components/common/expenses/fellows/fellow-expense-table-dropdown";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const RequestRepaymentSchema = z.object({
  comments: stringValidation("Please enter your comments"),
  mpesaNumber: stringValidation("Please confirm the Mpesa number"),
});

export default function RequestRepaymentFellows({
  children,
  expense,
}: {
  children: React.ReactNode;
  expense: FellowExpenseData;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof RequestRepaymentSchema>>({
    resolver: zodResolver(RequestRepaymentSchema),
    defaultValues: {
      comments: "",
      mpesaNumber: expense?.mpesaNo ?? "",
    },
  });

  const onSubmit = async (data: z.infer<typeof RequestRepaymentSchema>) => {
    const response = await submitRequestRepayment({
      id: expense.id,
      name: data.comments,
      mpesaNumber: data.mpesaNumber,
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
      description: "Successfully submitted request for repayment",
    });

    form.reset();
    setDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="sticky top-0 z-10 bg-white">
          <h2>Request Repayment</h2>
        </DialogHeader>
        <DialogAlertWidget
          label={`${expense?.fellowName} - ${expense?.session} - ${expense.schoolVenue}`}
        />
        <div className="w-[31rem]">
          <DialogAlertWidget
            label={`This action cannot be reversed. Note that the amount due will be deducted from ${expense?.fellowName}’s next salary.`}
            variant={"destructive"}
          />
        </div>
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="mpesaNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Confirm M-Pesa no.{" "}
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
              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional comments</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Text area"
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
                  Submit repayment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
