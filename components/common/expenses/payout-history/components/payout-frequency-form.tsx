"use client";

import { Button } from "#/components/ui/button";
import { DialogContent, DialogHeader } from "#/components/ui/dialog";
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
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  DaysOfWeek,
  PayoutFrequencyOptions,
  PayoutFrequencySchema,
  PayoutFrequencyType,
} from "../types";

export default function PayoutFrequencyForm() {
  const [loading, setLoading] = useState(false);

  const form = useForm<PayoutFrequencyType>({
    resolver: zodResolver(PayoutFrequencySchema),
    defaultValues: {
      payoutFrequency: "once_a_week",
      payoutDays: [],
      payoutTime: "09:00",
    },
  });

  const payoutFrequency = form.watch("payoutFrequency");

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      // TODO: Implement payout frequency update
      toast({
        title: "Success",
        description: "Payout frequency updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payout frequency",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <h2 className="text-xl font-bold">Payout Frequency Settings</h2>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="payoutFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PayoutFrequencyOptions.ONCE_A_WEEK}>
                        Once a week
                      </SelectItem>
                      <SelectItem value={PayoutFrequencyOptions.TWICE_A_WEEK}>
                        Twice a week
                      </SelectItem>
                      <SelectItem value={PayoutFrequencyOptions.BIWEEKLY}>
                        Once every two weeks
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payoutDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {payoutFrequency === PayoutFrequencyOptions.TWICE_A_WEEK
                      ? "Select Days"
                      : "Select Day"}
                  </FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={(value) => {
                      const days =
                        payoutFrequency === PayoutFrequencyOptions.TWICE_A_WEEK
                          ? [...field.value, value].slice(-2)
                          : [value];
                      field.onChange(days);
                    }}
                    value={field.value[0]}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day(s)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DaysOfWeek).map(([key, value]) => (
                        <SelectItem key={value} value={value}>
                          {key.charAt(0) + key.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payoutTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payout Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} placeholder="Select time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}
