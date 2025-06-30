"use client";
import {
  deleteSupervisorExpenseRequest,
  type HubSupervisorExpensesType,
} from "#/app/(platform)/hc/reporting/expenses/supervisors/actions";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
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
import { Input } from "#/components/ui/input";
import { toast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const DeleteExpenseRequestSchema = z.object({
  name: stringValidation("Please enter your name"),
});

export default function HCDeleteExpenseRequest({
  children,
  expense,
}: {
  children: React.ReactNode;
  expense: HubSupervisorExpensesType;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof DeleteExpenseRequestSchema>>({
    resolver: zodResolver(DeleteExpenseRequestSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof DeleteExpenseRequestSchema>) => {
    const response = await deleteSupervisorExpenseRequest({
      id: expense?.id,
      name: data.name,
    });
    if (!response.success) {
      toast({
        variant: "destructive",
        title: "Submission error",
        description: response.message ?? "An error occurred",
      });
      return;
    }

    revalidatePageAction("/hc/reporting/supervisors");

    toast({
      variant: "default",
      title: "Expense request deleted successfully",
    });

    form.reset();
    setDialogOpen(false);
  };

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="sticky top-0 z-10 bg-white">
          <h2 className="font-bold text-black">Delete Expense Request</h2>
        </DialogHeader>
        <p>Are you sure?</p>
        <DialogAlertWidget
          variant="destructive"
          label={`You are about to delete the expense request for ${expense?.amount} KES. Are you sure you want to proceed?`}
        />
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
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
                  variant="destructive"
                  loading={form.formState.isSubmitting}
                  disabled={form.formState.isSubmitting}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
