"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import ComplaintFormFields from "#/components/common/expenses/complaints/complaint-form-fields";
import { FileUploaderWithDrop } from "#/components/file-uploader";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { createComplaint, fetchComplaintContext } from "#/lib/actions/expenses/complaints-actions";
import type { PayoutHistoryEntry } from "#/lib/actions/expenses/payout-history";
import { zodResolver } from "#/lib/zod-resolver";
import { type ComplaintFormSchema, CreateComplaintSchema } from "./schema";

/**
 * Statement upload is switched off pending a decision on whether reviewers need
 * it. Inert rather than removed: the column, the optional `statement` field and
 * the presigned download on the complaints report are all still in place, so
 * re-enabling means restoring the uploader that writes the S3 key into the
 * form — see git history for the wired-up version.
 */
function StatementUploader() {
  return (
    <div>
      <div className="text-shamiri-text-grey">Upload Mpesa statement</div>
      <FileUploaderWithDrop
        onChange={() => {}}
        files={[]}
        accept=".csv"
        className="pointer-events-none cursor-not-allowed opacity-60"
      />
    </div>
  );
}

/**
 * Raises a payment complaint against a payout. The fellow is picked from the
 * fellows paid in that payout; their figures are loaded once chosen.
 */
export default function AddFellowComplaint({
  children,
  payout,
}: {
  children: React.ReactNode;
  payout: PayoutHistoryEntry;
}) {
  const [open, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingContext, startLoadingContext] = useTransition();
  // Guards against a slow response for a previously picked fellow landing after
  // a newer selection and mixing two fellows' details together.
  const selectedFellow = useRef("");

  const form = useForm<ComplaintFormSchema>({
    resolver: zodResolver(CreateComplaintSchema),
    defaultValues: {
      fellow: "",
      mpesaName: "",
      mpesaNumber: "",
      noOfTrainingSessions: 0,
      noOfSupervisionSessions: 0,
      noOfPreSessions: 0,
      noOfMainSessions: 0,
      noOfSpecialSessions: 0,
      paidAmount: 0,
      confirmedAmountReceived: 0,
      reasonForComplaint: "",
      comments: "",
      statement: "",
      reasonForAccepting: "",
      reasonForRejecting: "",
    },
  });

  /** Pulls the chosen fellow's M-Pesa details and session figures. */
  function selectFellow(fellowId: string) {
    form.setValue("fellow", fellowId, { shouldValidate: true });

    // What this payout actually paid the fellow. The complaint is about this
    // payout, so this is the figure the difference is measured against.
    // Number() because the amount comes from a raw SQL SUM(), which Postgres
    // types as bigint.
    const paidInThisPayout = payout.fellowDetails.find(
      (fellow) => fellow.fellowId === fellowId,
    )?.totalAmount;
    form.setValue("paidAmount", Number(paidInThisPayout ?? 0));

    selectedFellow.current = fellowId;

    startLoadingContext(async () => {
      const context = await fetchComplaintContext(fellowId);

      if (selectedFellow.current !== fellowId) {
        return;
      }

      if (!context) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load this fellow's payment details",
        });
        return;
      }

      form.setValue("mpesaName", context.mpesaName);
      form.setValue("mpesaNumber", context.mpesaNumber);
      form.setValue("noOfTrainingSessions", context.noOfTrainingSessions);
      form.setValue("noOfSupervisionSessions", context.noOfSupervisionSessions);
      form.setValue("noOfPreSessions", context.noOfPreSessions);
      form.setValue("noOfMainSessions", context.noOfMainSessions);
      form.setValue("noOfSpecialSessions", context.noOfSpecialSessions);
    });
  }

  async function onSubmit(data: ComplaintFormSchema) {
    setLoading(true);

    try {
      const response = await createComplaint({
        fellowId: data.fellow ?? "",
        payoutDate: payout.dateAdded,
        formData: data,
      });

      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message ?? "Something went wrong, please try again",
        });
        return;
      }

      toast({
        title: "Success",
        variant: "default",
        description: response.message ?? "Successfully raised complaint",
      });

      form.reset();
      setDialogOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="w-1/2 max-w-none">
          <DialogHeader className="bg-white">
            <h2>Add complaint</h2>
          </DialogHeader>

          <div className="min-w-max overflow-x-auto overflow-y-scroll px-1">
            <form
              className="space-y-2"
              onSubmit={form.handleSubmit(onSubmit, () => {
                // The invalid field can be scrolled out of view in this dialog,
                // so say something rather than appearing to do nothing.
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Please fill all required fields",
                });
              })}
            >
              <ComplaintFormFields
                form={form}
                fellowField={
                  <FormField
                    control={form.control}
                    name="fellow"
                    render={({ field }) => (
                      <div className="w-full">
                        <FormItem>
                          <FormLabel>
                            Select fellow <span className="text-shamiri-light-red">*</span>
                          </FormLabel>
                          <Select onValueChange={selectFellow} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a fellow" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {payout.fellowDetails.map((fellow) => (
                                <SelectItem key={fellow.fellowId} value={fellow.fellowId}>
                                  {fellow.fellowName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      </div>
                    )}
                  />
                }
                statementUploader={<StatementUploader />}
              />

              <Separator />

              <DialogFooter>
                <Button
                  type="button"
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
                  type="submit"
                  variant="brand"
                  disabled={loading || loadingContext}
                  loading={loading}
                >
                  Send complaint
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
