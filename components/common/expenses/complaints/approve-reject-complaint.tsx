"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import type { ComplaintData } from "#/components/common/expenses/complaints/complaints-actions-dropdown";
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
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { approveComplaint, rejectComplaint } from "#/lib/actions/expenses/complaints-actions";
import { zodResolver } from "#/lib/zod-resolver";
import { ApproveComplaintSchema, ComplaintFormSchema, RejectComplaintSchema } from "./schema";

export default function ApproveRejectFellowComplaint({
  children,
  complaint,
}: {
  children: React.ReactNode;
  complaint: ComplaintData;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState<boolean>(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const reasonsForComplaint = [
    {
      id: "1",
      reason: "Received less payment",
    },
    {
      id: "2",
      reason: "Received more payment",
    },
    {
      id: "3",
      reason: "Payment not received",
    },
  ];

  const form = useForm<ComplaintFormSchema>({
    resolver: zodResolver(ComplaintFormSchema),
    defaultValues: {
      fellow: complaint?.fellowName ?? "",
      mpesaNumber: complaint?.mpesaNumber ?? "",
      mpesaName: complaint?.mpesaName ?? "",
      noOfTrainingSessions: complaint?.noOfTrainingSessions ?? 0,
      noOfSupervisionSessions: complaint?.noOfSupervisionSessions ?? 0,
      noOfPreSessions: complaint?.noOfPreSessions ?? 0,
      noOfMainSessions: complaint?.noOfMainSessions ?? 0,
      noOfSpecialSessions: complaint?.noOfSpecialSessions ?? 0,
      paidAmount: complaint?.paidAmount ?? 0,
      confirmedAmountReceived: complaint?.confirmedAmountReceived ?? 0,
      reasonForComplaint: complaint?.reasonForComplaint ?? "",
      comments: complaint?.comments ?? "",
      reasonForAccepting: complaint?.reasonForAccepting ?? "",
      reasonForRejecting: complaint?.reasonForRejecting ?? "",
    },
  });

  /**
   * Runs from the confirm dialogs. The main form does not validate the outcome
   * reasons (they are typed here, after it has been submitted), so the matching
   * reason is validated at this point and its error is shown on the field the
   * reviewer is looking at.
   */
  async function submitOutcome(mode: "accept" | "reject") {
    const schema = mode === "accept" ? ApproveComplaintSchema : RejectComplaintSchema;
    const reasonField = mode === "accept" ? "reasonForAccepting" : "reasonForRejecting";
    const parsed = schema.safeParse(form.getValues());

    if (!parsed.success) {
      const reasonIssue = parsed.error.issues.find((issue) => issue.path[0] === reasonField);

      if (!reasonIssue) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please fill all required fields",
        });
        return;
      }

      form.setError(reasonField, { message: reasonIssue.message });
      return;
    }

    setLoading(true);

    try {
      const submit = mode === "accept" ? approveComplaint : rejectComplaint;
      const response = await submit({ id: complaint.id, formData: parsed.data });

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
        description:
          response.message ??
          (mode === "accept"
            ? "Successfully approved complaint"
            : "Successfully rejected complaint"),
      });

      form.reset();
      setApproveDialogOpen(false);
      setRejectDialogOpen(false);
      setDialogOpen(false);
    } finally {
      setLoading(false);
    }
  }

  /** Opens the confirm dialog for an outcome once the main form is valid. */
  const openConfirm = (mode: "accept" | "reject") => {
    // A reason left over from a previous attempt should not greet the reviewer
    // as an error when the confirm dialog reopens.
    form.clearErrors(["reasonForAccepting", "reasonForRejecting"]);
    setRejectDialogOpen(mode === "reject");
    setApproveDialogOpen(mode === "accept");
  };

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="w-1/2 max-w-none">
          <DialogHeader className="bg-white">
            <h2>Approve/reject complaint</h2>
          </DialogHeader>

          <DialogAlertWidget
            label={`${complaint.status}`}
            variant={complaint.status === "REJECTED" ? "destructive" : "primary"}
          />
          <div className="min-w-max overflow-x-auto overflow-y-scroll px-1">
            <form className="space-y-2" onSubmit={(event) => event.preventDefault()}>
              <FormField
                control={form.control}
                name="fellow"
                render={({ field }) => (
                  <div className="w-full">
                    <FormItem>
                      <FormLabel>
                        Fellow <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Please select a fellow"
                          className="w-full flex-1"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </div>
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
                          M-Pesa name <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="" className="w-full flex-1" {...field} />
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
                          M-Pesa number <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="" className="w-full flex-1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </div>
                  )}
                />
              </div>
              <div className="flex w-full space-x-2">
                <FormField
                  control={form.control}
                  name="noOfTrainingSessions"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          No. of training sessions <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder=""
                            className="w-full flex-1"
                            type="number"
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
                  name="noOfSupervisionSessions"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          No. of supervision sessions{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder=""
                            className="w-full flex-1"
                            type="number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </div>
                  )}
                />
              </div>
              <div className="flex w-full space-x-2">
                <FormField
                  control={form.control}
                  name="noOfPreSessions"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          No. of pre sessions <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder=""
                            className="w-full flex-1"
                            type="number"
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
                  name="noOfMainSessions"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          No. of main sessions <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder=""
                            className="w-full flex-1"
                            type="number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </div>
                  )}
                />
              </div>

              <div className="flex w-full space-x-2">
                <FormField
                  control={form.control}
                  name="noOfSpecialSessions"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          No. of special sessions
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder=""
                            className="w-full flex-1"
                            {...field}
                            type="number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paidAmount"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          Paid amount (KES) <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder=""
                            type="number"
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
              <FormField
                control={form.control}
                name="confirmedAmountReceived"
                render={({ field }) => (
                  <div className="w-full">
                    <FormItem>
                      <FormLabel>
                        Confirmed Total amount received from Shamiri (KES){" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="" className="w-full flex-1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </div>
                )}
              />

              <div>
                <div className="text-shamiri-text-grey">Upload Mpesa statement</div>
                {/* Not wired up yet: there is no upload pipeline behind this, so
                    it is inert rather than silently discarding the reviewer's
                    file. Drop the disabled styling once it writes a statement. */}
                <FileUploaderWithDrop
                  onChange={() => {}}
                  files={[]}
                  accept=".csv"
                  className="pointer-events-none cursor-not-allowed opacity-60"
                />
              </div>

              <FormField
                control={form.control}
                name="reasonForComplaint"
                render={({ field }) => (
                  <div className="w-full">
                    <FormItem>
                      <FormLabel>
                        Select reason for complaint{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          void form.trigger("reasonForComplaint");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reasonsForComplaint.map((reason) => (
                            <SelectItem key={reason.id} value={reason.reason}>
                              {reason.reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Additional comments <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
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
                  type="button"
                  variant="destructive"
                  onClick={form.handleSubmit(() => openConfirm("reject"))}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  onClick={form.handleSubmit(() => openConfirm("accept"))}
                >
                  Accept
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* reject */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="p-5">
          <DialogHeader>
            <h2>Reject Complaint</h2>
          </DialogHeader>
          <div className="space-y-4">
            <h3>Are you sure?</h3>
            <DialogAlertWidget
              label="Once this change has been made it is irreversible and will need you to contact support in order to modify."
              variant="destructive"
            />
          </div>

          <FormField
            control={form.control}
            name="reasonForRejecting"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Reason for rejection <span className="text-shamiri-light-red">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea placeholder="Inaccurate reporting" className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />
          <DialogFooter className="flex justify-end">
            <Button
              type="button"
              className="text-shamiri-light-red"
              variant="ghost"
              onClick={() => {
                setRejectDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void submitOutcome("reject")}
              disabled={loading}
              loading={loading}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* approve */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="p-5">
          <DialogHeader>
            <h2>Accept Complaint</h2>
          </DialogHeader>
          <div className="space-y-4">
            <h3>Are you sure?</h3>
            <DialogAlertWidget
              label="Once this change has been made it is irreversible and will need you to contact support in order to modify."
              variant="destructive"
            />
          </div>

          <FormField
            control={form.control}
            name="reasonForAccepting"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Reason for acceptance <span className="text-shamiri-light-red">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea placeholder="Inaccurate reporting" className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />
          <DialogFooter className="flex justify-end">
            <Button
              type="button"
              className="text-shamiri-light-red"
              variant="ghost"
              onClick={() => {
                setApproveDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void submitOutcome("accept")}
              disabled={loading}
              loading={loading}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
