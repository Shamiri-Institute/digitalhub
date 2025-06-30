"use client";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import type { SchoolFeedbackType } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import { editSchoolFeedback } from "#/components/common/school-reports/school-feedback/actions";
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

const SchoolFeedbackSchema = z.object({
  studentTeacherSatisfactionRating: z.number().min(1).max(5),
  factorsInfluencedStudentParticipation: z.string().min(1, "This field is required"),
  concernsRaisedByTeachers: z.string().min(1, "This field is required"),
  programImpactOnStudents: z.string().min(1, "This field is required"),
});

export type SchoolFeedbackFormValues = z.infer<typeof SchoolFeedbackSchema>;

export default function ViewEditSchoolFeedback({
  children,
  feedback,
  action,
}: {
  children: React.ReactNode;
  feedback: SchoolFeedbackType["supervisorRatings"][number];
  action: "view" | "edit";
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<SchoolFeedbackFormValues>({
    resolver: zodResolver(SchoolFeedbackSchema),
    defaultValues: {
      studentTeacherSatisfactionRating: feedback.studentTeacherSatisfaction ?? 0,
      factorsInfluencedStudentParticipation: feedback.factorsInfluencedStudentParticipation ?? "",
      concernsRaisedByTeachers: feedback.concernsRaisedByTeachers ?? "",
      programImpactOnStudents: feedback.programImpactOnStudents ?? "",
    },
  });

  const onSubmit = async (data: SchoolFeedbackFormValues) => {
    try {
      const response = await editSchoolFeedback(feedback.userId, feedback.feedbackId, data);
      if (response.success) {
        toast({
          title: response.message,
          variant: "default",
        });

        await revalidatePageAction("sc/reporting/school-reports/school-feedback");
      } else {
        toast({
          title: response.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Something went wrong",
        variant: "destructive",
      });
    }
    setDialogOpen(false);
  };

  const isViewOnly = action === "view";

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>{`${action === "view" ? "View" : "Edit"} School Feedback`}</h2>
        </DialogHeader>
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="studentTeacherSatisfactionRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student & Teacher Satisfaction Rating</FormLabel>
                    <FormControl>
                      <DataTableRatingStars rating={field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="factorsInfluencedStudentParticipation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factors Influencing Student Participation</FormLabel>
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
                name="concernsRaisedByTeachers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concerns Raised by Teachers</FormLabel>
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
                name="programImpactOnStudents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Impact on Students</FormLabel>
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
                  <Button variant="ghost" type="button" onClick={() => setDialogOpen(false)}>
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
