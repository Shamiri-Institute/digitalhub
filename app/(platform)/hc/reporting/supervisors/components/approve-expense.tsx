"use client";
import {
  approveSupervisorExpense,
  HubSupervisorExpensesType,
} from "#/app/(platform)/hc/reporting/supervisors/actions";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const ConfirmReversalSchema = z.object({
  amount: z.coerce.number({
    required_error: "Please enter the amount",
  }),
});
export default function HCApproveSupervisorExpense({
  children,
  expense,
}: {
  children: React.ReactNode;
  expense: HubSupervisorExpensesType;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof ConfirmReversalSchema>>({
    resolver: zodResolver(ConfirmReversalSchema),
    defaultValues: {
      amount: expense?.amount ?? "",
    },
  });

  const onSubmit = async (data: z.infer<typeof ConfirmReversalSchema>) => {
    const response = await approveSupervisorExpense({
      id: expense?.id,
      amount: data.amount,
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
      description: "Successfully approved expense",
    });

    form.reset();
    setDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="sticky top-0 z-10 bg-white">
          <h2>Approve expense</h2>
        </DialogHeader>
        <DialogAlertWidget
          label={`${expense.supervisorName} - ${expense?.amount} - ${expense.typeOfExpense}`}
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
                <Button className="bg-shamiri-new-blue text-base font-semibold leading-6 text-white">
                  {form.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
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
