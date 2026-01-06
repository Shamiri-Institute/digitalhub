"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfWeek, subWeeks } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { submitWeeklyTeamMeeting } from "#/app/(platform)/hc/supervisors/actions";
import RatingStars from "#/components/rating-stars";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { WeeklyHubTeamMeetingSchema } from "../../schemas";

function generateWeekFieldValues() {
  const numWeeks = 4;

  const selectValues = [];
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
  const form = useForm<z.infer<typeof WeeklyHubTeamMeetingSchema>>({
    resolver: zodResolver(WeeklyHubTeamMeetingSchema),
    defaultValues: {
      submittedBy: hubCoordinatorId,
      hubId,
      logisticsRelatedIssues: "",
      logisticsRelatedIssuesRating: 0,
      relationshipManagement: "",
      relationshipManagementRating: 0,
      digitalHubIssues: "",
      digitalHubIssuesRating: 0,
      anyOtherChallenges: "",
      anyOtherChallengesRating: 0,
      recommendations: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof WeeklyHubTeamMeetingSchema>) => {
    const response = await submitWeeklyTeamMeeting(data);
    if (!response.success) {
      toast({
        variant: "destructive",
        title: "Submission error",
        description: response.message ?? "Something went wrong during submission, please try again",
      });
      return;
    }

    toast({
      variant: "default",
      title: "Success",
      description: "Successfully submitted weekly hub team meeting report",
    });

    form.reset();
    setDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <DialogTrigger asChild>
          <Button variant="brand" className="">
            <span className="text-white">Weekly team meeting</span>
          </Button>
        </DialogTrigger>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold leading-7">Weekly team meeting</DialogTitle>
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
                      // @ts-expect-error
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
                  name="logisticsRelatedIssues"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex gap-4">
                        Logistics related issues <br /> (transport, payments)
                        <FormField
                          control={form.control}
                          name="logisticsRelatedIssuesRating"
                          render={({ field }) => (
                            <RatingStars rating={field.value} onSelect={field.onChange} />
                          )}
                        />
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="" className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="relationshipManagement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex gap-4">
                      Relationship management <br /> (schools & fellows)
                      <FormField
                        control={form.control}
                        name="relationshipManagementRating"
                        render={({ field }) => (
                          <RatingStars rating={field.value} onSelect={field.onChange} />
                        )}
                      />
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="digitalHubIssues"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex gap-4">
                      Digital hub issues
                      <FormField
                        control={form.control}
                        name="digitalHubIssuesRating"
                        render={({ field }) => (
                          <RatingStars rating={field.value} onSelect={field.onChange} />
                        )}
                      />
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="anyOtherChallenges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex gap-4">
                      Any other challenges
                      <FormField
                        control={form.control}
                        name="anyOtherChallengesRating"
                        render={({ field }) => (
                          <RatingStars rating={field.value} onSelect={field.onChange} />
                        )}
                      />
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="" className="resize-none" {...field} />
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
                    <FormLabel>Recommendations (to be followed up by the HQ team)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="" className="resize-none" {...field} />
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
