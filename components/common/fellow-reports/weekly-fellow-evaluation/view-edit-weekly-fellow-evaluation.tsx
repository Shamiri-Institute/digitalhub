"use client";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { WeeklyFellowEvaluation } from "#/app/(platform)/sc/reporting/fellow-reports/weekly-fellow-evaluation/types";
import { updateWeeklyEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/action";
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
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const WeeklyEvaluationSchema = z.object({
  behaviour: z.number().min(1).max(5),
  behaviourNotes: z.string().min(1, "This field is required"),
  programDelivery: z.number().min(1).max(5),
  programDeliveryNotes: z.string().min(1, "This field is required"),
  dressingGrooming: z.number().min(1).max(5),
  dressingGroomingNotes: z.string().min(1, "This field is required"),
  attendancePunctuality: z.number().min(1).max(5),
  attendancePunctualityNotes: z.string().min(1, "This field is required"),
});

export type WeeklyEvaluationFormValues = z.infer<typeof WeeklyEvaluationSchema>;

export default function ViewEditWeeklyFellowEvaluation({
  children,
  weeklyFellowEvaluation,
  action,
}: {
  children: React.ReactNode;
  weeklyFellowEvaluation: WeeklyFellowEvaluation["week"][number];
  action: "view" | "edit";
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<WeeklyEvaluationFormValues>({
    resolver: zodResolver(WeeklyEvaluationSchema),
    defaultValues: {
      behaviour: weeklyFellowEvaluation.behaviour ?? 0,
      behaviourNotes: weeklyFellowEvaluation.behaviourNotes ?? "",
      programDelivery: weeklyFellowEvaluation.programDelivery ?? 0,
      programDeliveryNotes: weeklyFellowEvaluation.programDeliveryNotes ?? "",
      dressingGrooming: weeklyFellowEvaluation.dressingGrooming ?? 0,
      dressingGroomingNotes: weeklyFellowEvaluation.dressingGroomingNotes ?? "",
      attendancePunctuality: weeklyFellowEvaluation.attendancePunctuality ?? 0,
      attendancePunctualityNotes:
        weeklyFellowEvaluation.attendancePunctualityNotes ?? "",
    },
  });

  const onSubmit = async (data: WeeklyEvaluationFormValues) => {
    try {
      const response = await updateWeeklyEvaluation(
        weeklyFellowEvaluation.userId,
        weeklyFellowEvaluation.evaluationId,
        data,
      );

      if (response.success) {
        toast({
          title: "Success",
          description: "Weekly evaluation updated successfully",
        });
        await revalidatePageAction(
          "sc/reporting/fellow-reports/weekly-fellow-evaluation",
        );
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive",
        });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const isViewOnly = action === "view";

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>{`${action === "view" ? "View" : "Edit"} Weekly Evaluation`}</h2>
        </DialogHeader>
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="behaviour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Behaviour Rating</FormLabel>
                    <FormControl>
                      <DataTableRatingStars rating={field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="behaviourNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Behaviour Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={isViewOnly}
                        className="min-h-[100px] resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="programDelivery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Delivery Rating</FormLabel>
                    <FormControl>
                      <DataTableRatingStars rating={field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="programDeliveryNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Delivery Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={isViewOnly}
                        className="min-h-[100px] resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dressingGrooming"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dressing & Grooming Rating</FormLabel>
                    <FormControl>
                      <DataTableRatingStars rating={field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dressingGroomingNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dressing & Grooming Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={isViewOnly}
                        className="min-h-[100px] resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attendancePunctuality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendance & Punctuality Rating</FormLabel>
                    <FormControl>
                      <DataTableRatingStars rating={field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attendancePunctualityNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendance & Punctuality Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={isViewOnly}
                        className="min-h-[100px] resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isViewOnly && (
                <DialogFooter>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="brand"
                    type="submit"
                    loading={form.formState.isSubmitting}
                    disabled={form.formState.isSubmitting}
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              )}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
