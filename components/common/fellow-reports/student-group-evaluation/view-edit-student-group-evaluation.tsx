"use client";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import {
  editStudentGroupEvaluation,
  type StudentGroupEvaluationType,
} from "#/components/common/fellow-reports/student-group-evaluation/actions";
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
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const StudentGroupEvaluationSchema = z.object({
  engagementComment: z.string().min(1, "Engagement comment is required"),
  cooperationComment: z.string().min(1, "Cooperation comment is required"),
  contentComment: z.string().min(1, "Content comment is required"),
});

type StudentGroupEvaluationFormValues = z.infer<typeof StudentGroupEvaluationSchema>;

export default function ViewEditStudentGroupEvaluation({
  children,
  studentGroupEvaluation,
  action = "view",
}: {
  children: React.ReactNode;
  studentGroupEvaluation: StudentGroupEvaluationType["session"][number];
  action: "view" | "edit";
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<StudentGroupEvaluationFormValues>({
    resolver: zodResolver(StudentGroupEvaluationSchema),
    defaultValues: {
      engagementComment: studentGroupEvaluation.engagementComment ?? "",
      cooperationComment: studentGroupEvaluation.cooperationComment ?? "",
      contentComment: studentGroupEvaluation.contentComment ?? "",
    },
  });

  const onSubmit = async (data: StudentGroupEvaluationFormValues) => {
    try {
      const response = await editStudentGroupEvaluation(studentGroupEvaluation.sessionId, data);
      if (response.success) {
        toast({
          title: "Success",
          description: "Student group evaluation updated successfully",
        });
        await revalidatePageAction("sc/reporting/fellow-reports/student-group-evaluation");
        setDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update evaluation",
          variant: "destructive",
        });
      }
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
          <h2>{`${action === "view" ? "View" : "Edit"} Student Group Evaluation`}</h2>
        </DialogHeader>
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <div className="mb-2">
            <label className="text-sm font-medium">Session</label>
            <Select disabled value={studentGroupEvaluation.session?.toString() ?? ""}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={studentGroupEvaluation.session?.toString() ?? ""}>
                  {studentGroupEvaluation.session?.toString() ?? "No session"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Rate cooperation (1-very bad to 5-very good){" "}
              <span className="text-shamiri-light-red">*</span>
            </label>
            <div className="my-1">
              <DataTableRatingStars rating={studentGroupEvaluation.cooperation ?? 0} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">
              Rate engagement (1-very bad to 5-very good){" "}
              <span className="text-shamiri-light-red">*</span>
            </label>
            <div className="my-1">
              <DataTableRatingStars rating={studentGroupEvaluation.engagement ?? 0} />
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="engagementComment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Engagement Comments <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
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
                name="cooperationComment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Cooperation Comments <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
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
                name="contentComment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Content Comments <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
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
