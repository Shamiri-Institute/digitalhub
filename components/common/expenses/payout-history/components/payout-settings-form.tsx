"use client";

import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  hubs: z.array(z.string()).min(1, "Select at least one hub"),
  payoutFrequency: z.enum(["twice_week", "once_week", "biweekly", "monthly"]),
  day1: z.string().optional(),
  day2: z.string().optional(),
  trainingRate: z.number().min(1, "Must be greater than 0"),
  preSessionRate: z.number().min(1, "Must be greater than 0"),
  mainSessionRate: z.number().min(1, "Must be greater than 0"),
  supervisionRate: z.number().min(1, "Must be greater than 0"),
});

const weekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function PayoutSettingsForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hubs: [],
      trainingRate: 0,
      preSessionRate: 0,
      mainSessionRate: 0,
      supervisionRate: 0,
    },
  });

  const payoutFrequency = form.watch("payoutFrequency");

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log(data);
    // Handle form submission
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <h2 className="text-xl font-bold">Payout Settings</h2>
      </DialogHeader>

      <Alert variant="destructive" className="mb-4">
        <AlertDescription>
          Once this change has been made it is irreversible and will need you to
          contact support in order to modify. Please be sure of your action
          before you confirm.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="hubs"
            render={() => (
              <FormItem>
                <FormLabel>Select Hubs</FormLabel>
                <div className="space-y-2">
                  {/* Replace with actual hubs data */}
                  {["Hub 1", "Hub 2", "Hub 3"].map((hub) => (
                    <div key={hub} className="flex items-center space-x-2">
                      <Checkbox
                        onCheckedChange={(checked) => {
                          const currentHubs = form.getValues("hubs");
                          if (checked) {
                            form.setValue("hubs", [...currentHubs, hub]);
                          } else {
                            form.setValue(
                              "hubs",
                              currentHubs.filter((h) => h !== hub),
                            );
                          }
                        }}
                      />
                      <label>{hub}</label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payoutFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payout Frequency</FormLabel>
                <Select onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twice_week">Twice a week</SelectItem>
                    <SelectItem value="once_week">Once a week</SelectItem>
                    <SelectItem value="biweekly">
                      Once every two weeks
                    </SelectItem>
                    <SelectItem value="monthly">Once a month</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {payoutFrequency && (
            <FormField
              control={form.control}
              name="day1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day 1</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map((day) => (
                        <SelectItem key={day} value={day.toLowerCase()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {payoutFrequency === "twice_week" && (
            <FormField
              control={form.control}
              name="day2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day 2</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map((day) => (
                        <SelectItem key={day} value={day.toLowerCase()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="space-y-4">
            <h3 className="font-semibold">Set Payment Rate (KES)</h3>

            <FormField
              control={form.control}
              name="trainingRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Session</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preSessionRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervention Pre-session</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mainSessionRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervention Main-session</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supervisionRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervention Supervision Session</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}
