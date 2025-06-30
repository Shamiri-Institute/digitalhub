"use client";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { updateWeeklyEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/action";
import type { WeeklyFellowEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/types";
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
  behaviourRating: z.number().min(1).max(5),
  behaviourNotes: z.string().min(1, "This field is required"),
  programDeliveryRating: z.number().min(1).max(5),
  programDeliveryNotes: z.string().min(1, "This field is required"),
  dressingAndGroomingRating: z.number().min(1).max(5),
  dressingAndGroomingNotes: z.string().min(1, "This field is required"),
  punctualityRating: z.number().min(1).max(5),
  punctualityNotes: z.string().min(1, "This field is required"),
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
      behaviourRating: weeklyFellowEvaluation.behaviour ?? 0,
      behaviourNotes: weeklyFellowEvaluation.behaviourNotes ?? "",
      programDeliveryRating: weeklyFellowEvaluation.programDelivery ?? 0,
      programDeliveryNotes: weeklyFellowEvaluation.programDeliveryNotes ?? "",
      dressingAndGroomingRating: weeklyFellowEvaluation.dressingGrooming ?? 0,
      dressingAndGroomingNotes:
        weeklyFellowEvaluation.dressingGroomingNotes ?? "",
      punctualityRating: weeklyFellowEvaluation.attendancePunctuality ?? 0,
      punctualityNotes: weeklyFellowEvaluation.attendancePunctualityNotes ?? "",
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
          <h2>{`${action === "view" ? "View" : "Edit"} Weekly fellow evaluation`}</h2>
        </DialogHeader>
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="behaviourRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Rate behaviour (1-unacceptable, 5-outstanding){" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
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
                name="programDeliveryRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Rate program delivery (1-unacceptable, 5-outstanding){" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
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
                name="dressingAndGroomingRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Rate dressing & grooming (1-very bad, 5-very good){" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <FormControl>
                      <DataTableRatingStars rating={field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dressingAndGroomingNotes"
                render={({ field }) => (
                  <FormItem>
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
                name="punctualityRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Rate Session attendance & punctuality (1-very bad, 5-very
                      good) <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <FormControl>
                      <DataTableRatingStars rating={field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="punctualityNotes"
                render={({ field }) => (
                  <FormItem>
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
