"use client";

import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import type { ComplaintFormSchema } from "./schema";

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

/**
 * The complaint field set, shared by the add and approve/reject dialogs so the
 * two stay in step. The statement upload and the fellow control are slots
 * because the dialogs differ there.
 *
 * Everything except the confirmed amount, the reason and the comments is
 * read-only: neither write persists those fields, so letting anyone edit them
 * would silently discard the change.
 */
export default function ComplaintFormFields({
  form,
  fellowField,
  statementUploader,
}: {
  form: UseFormReturn<ComplaintFormSchema>;
  /** The fellow control: a Select when adding, a text input when reviewing. */
  fellowField: React.ReactNode;
  statementUploader: React.ReactNode;
}) {
  return (
    <>
      {fellowField}

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
                  <Input placeholder="" className="w-full flex-1" {...field} disabled />
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
                  <Input placeholder="" className="w-full flex-1" {...field} disabled />
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
                    disabled
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
                  No. of supervision sessions <span className="text-shamiri-light-red">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder=""
                    className="w-full flex-1"
                    type="number"
                    {...field}
                    disabled
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
                    disabled
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
                    disabled
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
                    disabled
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
                    disabled
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
                <Input placeholder="" type="number" className="w-full flex-1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          </div>
        )}
      />
      {statementUploader}
      <FormField
        control={form.control}
        name="reasonForComplaint"
        render={({ field }) => (
          <div className="w-full">
            <FormItem>
              <FormLabel>
                Select reason for complaint <span className="text-shamiri-light-red">*</span>
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
    </>
  );
}
