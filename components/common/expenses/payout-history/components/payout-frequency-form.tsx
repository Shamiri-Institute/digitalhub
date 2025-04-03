"use client";

import { setPayoutFrequencySettings } from "#/components/common/expenses/payout-history/actions";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  DaysOfWeek,
  PayoutFrequencyOptions,
  PayoutFrequencySchema,
  PayoutFrequencyType,
} from "../types";

type ProjectWithPayoutSettings = Prisma.ProjectGetPayload<{
  include: {
    payoutFrequencySettings: true;
  };
}>;

export default function PayoutFrequencyForm({
  projects,
}: {
  projects: ProjectWithPayoutSettings[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<ProjectWithPayoutSettings | null>(null);

  const form = useForm<PayoutFrequencyType>({
    resolver: zodResolver(PayoutFrequencySchema),
    defaultValues: {
      projectId: "",
      payoutFrequency: PayoutFrequencyOptions.ONCE_A_WEEK,
      payoutDays: [],
      payoutTime: "09:00",
    },
  });

  const payoutFrequency = form.watch("payoutFrequency");
  const selectedDays = form.watch("payoutDays");

  const onProjectChange = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setSelectedProject(project || null);
    form.setValue("projectId", projectId);

    if (project?.payoutFrequencySettings) {
      // If project has existing settings, populate the form
      form.setValue(
        "payoutFrequency",
        project.payoutFrequencySettings
          .frequency as (typeof PayoutFrequencyOptions)[keyof typeof PayoutFrequencyOptions],
      );
      form.setValue("payoutDays", project.payoutFrequencySettings.days);
      form.setValue("payoutTime", project.payoutFrequencySettings.time);
    } else {
      // Reset to defaults
      form.setValue("payoutFrequency", PayoutFrequencyOptions.ONCE_A_WEEK);
      form.setValue("payoutDays", []);
      form.setValue("payoutTime", "09:00");
    }
  };

  const handleDayToggle = (day: string) => {
    const currentDays = [...selectedDays];

    if (payoutFrequency === PayoutFrequencyOptions.TWICE_A_WEEK) {
      if (currentDays.includes(day)) {
        const index = currentDays.indexOf(day);
        if (index > -1) {
          currentDays.splice(index, 1);
        }
      } else if (currentDays.length < 2) {
        currentDays.push(day);
      }
    } else {
      if (currentDays.includes(day)) {
        const index = currentDays.indexOf(day);
        if (index > -1) {
          currentDays.splice(index, 1);
        }
      } else {
        currentDays.length = 0;
        currentDays.push(day);
      }
    }

    form.setValue("payoutDays", currentDays);
  };

  const onSubmit = async (data: PayoutFrequencyType) => {
    try {
      const response = await setPayoutFrequencySettings(data);
      if (response.success) {
        toast({
          title: "Success",
          description: "Payout frequency settings saved successfully",
        });
        setIsOpen(false);
        form.reset();
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save payout frequency settings",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white">
          Payout Frequency
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <h2 className="text-xl font-bold">Payout Frequency Settings</h2>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        onProjectChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedProject && (
                <>
                  <FormField
                    control={form.control}
                    name="payoutFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem
                              value={PayoutFrequencyOptions.ONCE_A_WEEK}
                            >
                              Once a week
                            </SelectItem>
                            <SelectItem
                              value={PayoutFrequencyOptions.TWICE_A_WEEK}
                            >
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
                          {payoutFrequency ===
                          PayoutFrequencyOptions.TWICE_A_WEEK
                            ? "Select Days (up to 2)"
                            : "Select Day"}
                        </FormLabel>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {Object.entries(DaysOfWeek).map(([key, value]) => (
                            <div
                              key={value}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={value}
                                checked={field.value.includes(value)}
                                onCheckedChange={() => handleDayToggle(value)}
                              />
                              <label
                                htmlFor={value}
                                className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {key.charAt(0) + key.slice(1).toLowerCase()}
                              </label>
                            </div>
                          ))}
                        </div>
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
                          <Input
                            type="time"
                            {...field}
                            placeholder="Select time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
                className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
              >
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
