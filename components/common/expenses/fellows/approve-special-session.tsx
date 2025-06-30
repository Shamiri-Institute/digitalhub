"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import type { FellowExpenseData } from "#/components/common/expenses/fellows/fellow-expense-table-dropdown";
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
import { Textarea } from "#/components/ui/textarea";
import { stringValidation } from "#/lib/utils";

export const RequestSpecialSessionSchema = z.object({
  comments: stringValidation("Please enter your comments"),
  amount: z.coerce.number({
    required_error: "Please enter the amount",
  }),
});

export default function ApproveSpecialSessionFellows({
  children,
  expense,
}: {
  children: React.ReactNode;
  expense: FellowExpenseData;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open]);

  const form = useForm<z.infer<typeof RequestSpecialSessionSchema>>({
    resolver: zodResolver(RequestSpecialSessionSchema),
    defaultValues: {
      comments: "",
      amount: expense?.amount ?? "",
    },
  });

  const onSubmit = async (data: z.infer<typeof RequestSpecialSessionSchema>) => {
    // todo: add action to approve special session
    form.reset();
    setDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="sticky top-0 z-10 bg-white">
          <h2>Approve special session</h2>
        </DialogHeader>
        <DialogAlertWidget
          label={`${expense?.fellowName} - ${expense?.session} - ${expense.schoolVenue}`}
        />
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Confirm amount (KES) {""}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="" className="resize-none" {...field} />
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
                    <FormLabel>Confirm comments/reason for special session</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Extra transport cost to the school"
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
                  onClick={() => {
                    form.reset();
                    setDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  loading={form.formState.isSubmitting}
                  disabled={form.formState.isSubmitting}
                  variant="brand"
                >
                  Accept
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
