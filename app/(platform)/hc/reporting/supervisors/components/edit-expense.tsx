"use client";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { useEffect, useState } from "react";

import {
  HubSupervisorExpensesType,
  updateSupervisorExpense,
} from "#/app/(platform)/hc/reporting/supervisors/actions";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfWeek, subWeeks } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";

function generateWeekFieldValues() {
  const numWeeks = 4;

  let selectValues = [];
  const today = new Date();

  for (let i = numWeeks; i >= 0; i--) {
    const date = subWeeks(today, i);
    const week = startOfWeek(date, { weekStartsOn: 1 });
    selectValues.push(
      <SelectItem value={format(week, "yyyy-MM-dd")}>
        {format(week, "dd/MM/yyyy")}
      </SelectItem>,
    );
  }

  return selectValues;
}

export const EditSupervisorExpenseSchema = z.object({
  week: z.string(),
  expenseType: stringValidation("Please select an expense type"),
  session: stringValidation("Please select a session"),
  totalAmount: stringValidation("Please enter the total amount"),
  mpesaName: stringValidation("Please enter the M-Pesa name"),
  mpesaNumber: stringValidation("Please enter the M-Pesa number"),
});

export default function HCEditSupervisorExpense({
  children,
  expense,
}: {
  children: React.ReactNode;
  expense: HubSupervisorExpensesType;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof EditSupervisorExpenseSchema>>({
    resolver: zodResolver(EditSupervisorExpenseSchema),
    defaultValues: {
      week: format(expense.dateOfExpense, "yyyy-MM-dd"),
      expenseType: String(expense.typeOfExpense ?? ""),
      session: String(expense.session ?? ""),
      totalAmount: expense.amount.toString(),
      mpesaName: expense.mpesaName ?? "",
      mpesaNumber: expense.mpesaNumber ?? "",
    },
  });

  const transportSubtype = form.getValues("expenseType");

  const onSubmit = async (
    data: z.infer<typeof EditSupervisorExpenseSchema>,
  ) => {
    const response = await updateSupervisorExpense({
      id: expense.id,
      data,
    });

    if (!response.success) {
      toast({
        variant: "destructive",
        title: "Submission error",
        description:
          response.message ??
          "Something went wrong during update, please try again",
      });
      return;
    }

    revalidatePageAction("/hc/reporting/supervisors");
    toast({
      variant: "default",
      title: "Success",
      description: "Successfully updated expense",
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
          <h2>Edit Expense</h2>
        </DialogHeader>
        <Separator />
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Select date /time{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a date/time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>{generateWeekFieldValues()}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2">
                <FormField
                  control={form.control}
                  name="expenseType"
                  render={({ field }) => (
                    <div className="grid w-full ">
                      <FormLabel>
                        Expense type
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <Select
                        name="expenseType"
                        defaultValue={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select reason
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Self">Self</SelectItem>
                          <SelectItem value="Material">Material</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="session"
                  render={({ field }) => (
                    <div className="grid w-full">
                      <FormLabel>
                        Select session
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <Select
                        name="session"
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select session" />
                        </SelectTrigger>
                        <SelectContent>
                          {transportSubtype === "Self" ? (
                            <>
                              <SelectItem value="F1">Follow-up 1</SelectItem>
                              <SelectItem value="F2">Follow-up 2</SelectItem>
                              <SelectItem value="F3">Follow-up 3</SelectItem>
                              <SelectItem value="F4">Follow-up 4</SelectItem>
                              <SelectItem value="F5">Follow-up 5</SelectItem>
                              <SelectItem value="F6">Follow-up 6</SelectItem>
                              <SelectItem value="F7">Follow-up 7</SelectItem>
                              <SelectItem value="F8">Follow-up 8</SelectItem>
                              <SelectItem value="data-collection">
                                Data collection
                              </SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Pre">Pre session</SelectItem>
                              <SelectItem value="S1">Session 1</SelectItem>
                              <SelectItem value="S2">Session 2</SelectItem>
                              <SelectItem value="S3">Session 3</SelectItem>
                              <SelectItem value="S4">Session 4</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Total Amount (KES){" "}
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
              <div className="flex w-full space-x-2">
                <FormField
                  control={form.control}
                  name="mpesaName"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          M-Pesa name.{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder=""
                            className="w-full flex-1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mpesaNumber"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          M-Pesa no.{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder=""
                            className="w-full flex-1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </div>
                  )}
                />
              </div>
              <Separator />

              <DialogFooter>
                <Button
                  variant="ghost"
                  type="button"
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
                  Submit
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
