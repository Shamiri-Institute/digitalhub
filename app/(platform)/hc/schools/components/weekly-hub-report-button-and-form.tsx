"use client";

import RatingStars from "#/components/rating-stars";
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
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfWeek, subWeeks } from "date-fns";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import AddCircleOutlined from "../../../../../public/icons/add-circle-outline.svg";
import { WeeklyHubReportSchema } from "../../schemas";
import { submitWeeklyHubReport } from "../actions";

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
      successes: "",
      challenges: "",
      schoolRelatedIssuesAndObservations: "",
      schoolRelatedIssuesAndObservationRating: 0,
      hubRelatedIssuesAndObservations: "",
      hubRelatedIssuesAndObservationsRating: 0,
      supervisorRelatedIssuesAndObservations: "",
      supervisorRelatedIssuesAndObservationsRating: 0,
      fellowRelatedIssuesAndObservations: "",
      fellowRelatedIssuesAndObservationsRating: 0,
      recommendations: "",
      submittedBy: hubCoordinatorId,
      hubId,
    },
  });

  const onSubmit = async (data: z.infer<typeof WeeklyHubReportSchema>) => {
    const response = await submitWeeklyHubReport(data);
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

    toast({
      variant: "default",
      title: "Success",
      description: "Successfully submitted weekly hub report",
    });

    form.reset();
    setDialogOpen(false);
  };

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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-xl font-semibold leading-7">
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
              <div className="flex items-center">
                <FormField
                  control={form.control}
                  name="hubRelatedIssuesAndObservations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex gap-4">
                        Hub Related Issues and Observations{" "}
                        <FormField
                          control={form.control}
                          name="hubRelatedIssuesAndObservationsRating"
                          render={({ field }) => (
                            <RatingStars
                              rating={field.value}
                              onSelect={field.onChange}
                            />
                          )}
                        />
                      </FormLabel>
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
              <FormField
                control={form.control}
                name="schoolRelatedIssuesAndObservations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex gap-4">
                      School Related Issues and Observations
                      <FormField
                        control={form.control}
                        name="schoolRelatedIssuesAndObservationRating"
                        render={({ field }) => (
                          <RatingStars
                            rating={field.value}
                            onSelect={field.onChange}
                          />
                        )}
                      />
                    </FormLabel>
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
                name="supervisorRelatedIssuesAndObservations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex gap-4">
                      Supervisor Related Issues and Observations
                      <FormField
                        control={form.control}
                        name="supervisorRelatedIssuesAndObservationsRating"
                        render={({ field }) => (
                          <RatingStars
                            rating={field.value}
                            onSelect={field.onChange}
                          />
                        )}
                      />
                    </FormLabel>
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
                name="fellowRelatedIssuesAndObservations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex gap-4">
                      Fellow Related Issues and Observations
                      <FormField
                        control={form.control}
                        name="fellowRelatedIssuesAndObservationsRating"
                        render={({ field }) => (
                          <RatingStars
                            rating={field.value}
                            onSelect={field.onChange}
                          />
                        )}
                      />
                    </FormLabel>
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
                name="successes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Successes</FormLabel>
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
                name="challenges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challenges</FormLabel>
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
            <Separator className="my-4" />
            <DialogFooter>
              <Button
                variant="ghost"
                className="text-base font-semibold leading-6 text-shamiri-red"
                onClick={() => {
                  form.reset();
                  setDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button className="bg-shamiri-new-blue text-base font-semibold leading-6 text-white">
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
