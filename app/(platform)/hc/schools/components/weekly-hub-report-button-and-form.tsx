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
import { Textarea } from "#/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfWeek, subWeeks } from "date-fns";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import AddCircleOutlined from "../../../../../public/icons/add-circle-outline.svg";
import { WeeklyHubReportSchema } from "../../schemas";

function generateWeekFieldValues() {
  const numWeeks = 4;

  let selectValues = [];
  const today = new Date();

  for (let i = numWeeks; i >= 0; i--) {
    const date = subWeeks(today, i);
    const week = startOfWeek(date, { weekStartsOn: 1 });
    selectValues.push(
      <SelectItem value={format(week, "yyyy-MM-dd")}>
        Week {numWeeks - i + 1} - {format(week, "dd/MM/yyyy")}
      </SelectItem>,
    );
  }

  return selectValues;
}

export default function WeeklyHubReportButtonAndForm({
  hubCoordinatorId,
  hubId,
}: {
  hubCoordinatorId: string;
  hubId: string;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);
  const form = useForm<z.infer<typeof WeeklyHubReportSchema>>({
    resolver: zodResolver(WeeklyHubReportSchema),
    defaultValues: {
      positiveHighlights: "",
      recommendations: "",
      reportedChallenges: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof WeeklyHubReportSchema>) => {};

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white">
          <Image
            unoptimized
            priority
            src={AddCircleOutlined}
            alt="Add icon circle outlined"
            width={24}
            height={24}
          />
          Weekly Hub Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="text- font-semibold leading-7">
          Submit weekly hub report
        </DialogHeader>
        <Separator />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select week</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      // @ts-ignore
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select week" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>{generateWeekFieldValues()}</SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="positiveHighlights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Positive Highlights</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder=""
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reportedChallenges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reported Challenges</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder=""
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recommendations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recommendations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder=""
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator />
            <DialogFooter>
              <Button
                variant="ghost"
                className="text-base font-semibold leading-6 text-shamiri-new-blue"
              >
                Cancel
              </Button>
              <Button className="bg-shamiri-new-blue text-base font-semibold leading-6 text-white">
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
