"use client";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfWeek, subWeeks } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";

import { addSupervisorExpense } from "#/app/(platform)/hc/reporting/supervisors/actions";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { formatBytes } from "#/app/(platform)/profile/refund/refund-form";
import { Icons } from "#/components/icons";
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
import { Prisma } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useS3Upload } from "next-s3-upload";

export const AddAddSupervisorExpenseSchema = z.object({
  week: z.string(),
  expenseType: stringValidation("Please select an expense type"),
  session: stringValidation("Please select a session"),
  totalAmount: stringValidation("Please enter the total amount"),
  mpesaName: stringValidation("Please enter the M-Pesa name"),
  mpesaNumber: stringValidation("Please enter the M-Pesa number"),
  receiptFileKey: stringValidation("Please upload a receipt"),
  supervisor: stringValidation("Please select a supervisor"),
});

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

export default function AddSupervisorExpensesForm({
  children,
  supervisorsInHub,
}: {
  children: React.ReactNode;
  supervisorsInHub: Prisma.SupervisorGetPayload<{}>[];
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof AddAddSupervisorExpenseSchema>>({
    resolver: zodResolver(AddAddSupervisorExpenseSchema),
    defaultValues: {
      week: "",
      expenseType: "",
      session: "",
      totalAmount: "",
      mpesaName: "",
      mpesaNumber: "",
      receiptFileKey: "",
      supervisor: "",
    },
  });

  const transportSubtype = form.getValues("expenseType");

  const onSubmit = async (
    data: z.infer<typeof AddAddSupervisorExpenseSchema>,
  ) => {
    const response = await addSupervisorExpense({
      data,
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

    revalidatePageAction("/hc/reporting/supervisors");
    toast({
      variant: "default",
      title: "Success",
      description: "Successfully added expense",
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
          <h2>Add Expense</h2>
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

              <FormField
                control={form.control}
                name="supervisor"
                render={({ field }) => (
                  <div className="grid w-full ">
                    <FormLabel>
                      Select Supervisor
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <Select
                      name="supervisor"
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
                              Select supervisor
                            </span>
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisorsInHub.map((supervisor) => (
                          <SelectItem value={supervisor.id} key={supervisor.id}>
                            {supervisor.supervisorName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select session
                              </span>
                            }
                          />
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
              <ReceiptFileUpload form={form} className="flex flex-col gap-2" />

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

export function ReceiptFileUpload({
  form,
  className,
}: {
  form: UseFormReturn<
    z.infer<typeof AddAddSupervisorExpenseSchema>,
    any,
    undefined
  >;
  className: string;
}) {
  const { FileInput, openFileDialog, uploadToS3 } = useS3Upload();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        const { key } = await uploadToS3(file, {
          endpoint: {
            request: {
              url: "/api/files/upload",
              body: {},
              headers: {},
            },
          },
        });
        if (key) {
          form.setValue("receiptFileKey", key);
          setFile(file);
        }
      } catch (error) {
        console.error("File upload error:", error);
      } finally {
        setUploading(false);
      }
    },
    [form, uploadToS3],
  );

  return (
    <div>
      <button
        type="button"
        onClick={openFileDialog}
        disabled={uploading}
        className="flex w-full items-center space-x-6 rounded-lg  border-2 border-dashed border-secondary p-3"
      >
        <div className="cursor-pointer rounded-lg border border-gray-200 p-2">
          <span className="text-normal cursor-pointer text-center">
            {uploading ? "Uploading receipt..." : "Upload receipt"}
          </span>
        </div>

        <div className="flex space-x-2">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Icons.uploadCloudIcon className="h-6 w-6" />
          )}
        </div>
      </button>
      <FileInput onChange={handleFileChange} />

      {form.formState.errors.receiptFileKey && (
        <p className="text-shamiri-light-red">
          {form.formState.errors.receiptFileKey.message}
        </p>
      )}

      {file && (
        <div>
          <span>
            {file.name} ({formatBytes(file.size)})
          </span>
        </div>
      )}
      <Input
        id="receiptFileKey"
        type="text"
        {...form.register("receiptFileKey", {
          required: "Please upload the receipt",
        })}
        className="hidden h-10 py-2"
      />
    </div>
  );
}
