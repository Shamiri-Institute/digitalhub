"use client";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import type { ComplaintData } from "#/components/common/expenses/complaints/complaints-actions-dropdown";
import { ReportFellowComplaintSchema } from "#/components/common/expenses/complaints/schema";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

export default function ViewFellowComplaint({
  children,
  complaint,
}: {
  children: React.ReactNode;
  complaint: ComplaintData;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof ReportFellowComplaintSchema>>({
    resolver: zodResolver(ReportFellowComplaintSchema),
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
      confirmedAmountReceived: complaint?.confirmedTotalReceived ?? 0,
      reasonForComplaint: complaint?.reasonForComplaint ?? "",
      comments: complaint?.comments ?? "",
      reasonForAccepting: complaint?.reasonForAccepting ?? "",
      reasonForRejecting: complaint?.reasonForRejecting ?? "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10">
        <DialogHeader className="bg-white">
          <h2>Approve/reject complaint</h2>
        </DialogHeader>

        <DialogAlertWidget
          label={`${complaint.status}`}
          variant={complaint.status === "REJECTED" ? "destructive" : "primary"}
        />
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-1">
          <Form {...form}>
            <form className="space-y-2">
              <FormField
                control={form.control}
                name="fellow"
                disabled
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>
                      Select fellow (KES){" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <Select disabled defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a fellow" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem
                          key={complaint.fellowName}
                          value={complaint.fellowName!}
                        >
                          {complaint?.fellowName}
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                          M-Pesa name{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="w-full flex-1"
                            disabled
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
                          M-Pesa number{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            disabled
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
              <div className="flex w-full space-x-2">
                <FormField
                  control={form.control}
                  name="noOfTrainingSessions"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          No. of training sessions{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            disabled
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
                            disabled
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
              <div className="flex w-full space-x-2">
                <FormField
                  control={form.control}
                  name="noOfPreSessions"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          No. of pre sessions{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            disabled
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
                  name="noOfMainSessions"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          No. of main sessions{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            disabled
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
                            disabled
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
                  name="paidAmount"
                  render={({ field }) => (
                    <div className="w-full">
                      <FormItem>
                        <FormLabel>
                          Paid amount (KES){" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            disabled
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
                        <Input disabled className="w-full flex-1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </div>
                )}
              />

              <div>
                <div>
                  Upload Mpesa statement{" "}
                  <span className="text-shamiri-light-red">*</span>
                </div>
                <FileUploaderWithDrop
                  label="Upload csv file"
                  onChange={() => {}}
                  files={[]}
                  accept=".csv"
                  className="pointer-events-none cursor-not-allowed"
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
                      <Select disabled defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem
                            key={complaint?.reasonForComplaint}
                            value={complaint?.reasonForComplaint!}
                          >
                            {complaint?.reasonForComplaint}
                          </SelectItem>
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
                      Additional comments{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Extra transport cost to the school"
                        className="resize-none"
                        {...field}
                        disabled
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {complaint.status === "APPROVED" && (
                <FormField
                  control={form.control}
                  name="reasonForAccepting"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Reasons for accepting{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          disabled
                          placeholder="Extra transport cost to the school"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {complaint.status === "REJECTED" && (
                <FormField
                  control={form.control}
                  name="reasonForRejecting"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Reasons for rejecting{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          disabled
                          placeholder="Extra transport cost to the school"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              <DialogFooter>
                <Button
                  onClick={() => {
                    form.reset();
                    setDialogOpen(false);
                  }}
                  variant="brand"
                >
                  Done
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
