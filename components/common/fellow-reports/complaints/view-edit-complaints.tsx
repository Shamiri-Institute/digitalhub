"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import {
  editFellowComplaint,
  type FellowComplaintsType,
} from "#/components/common/fellow-reports/complaints/actions";
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

const ComplaintSchema = z.object({
  complaint: z.string().min(1, "Complaint is required"),
});

type ComplaintFormValues = z.infer<typeof ComplaintSchema>;

export default function ViewEditFellowComplaints({
  children,
  fellowComplaints,
  action = "view",
}: {
  children: React.ReactNode;
  fellowComplaints: FellowComplaintsType["complaints"][number];
  action: "view" | "edit";
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(ComplaintSchema),
    defaultValues: {
      complaint: fellowComplaints.complaint,
    },
  });

  const onSubmit = async (data: ComplaintFormValues) => {
    try {
      const response = await editFellowComplaint(fellowComplaints.complaintId, data.complaint);

      if (response.success) {
        toast({
          title: "Success",
          description: "Complaint updated successfully",
        });
        await revalidatePageAction("hc/reporting/fellow-reports/complaints");
        setDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update complaint",
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
          <h2>{`${action === "view" ? "View" : "Edit"} Fellow Complaint`}</h2>
        </DialogHeader>
        <DialogAlertWidget label={`${fellowComplaints.fellowName}`} separator={true} />
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="text-sm font-medium">
                Date of Complaint
              </label>
              <p className="text-gray-600">{fellowComplaints.date}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="complaint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complaint</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={isViewOnly}
                        className="min-h-[150px] resize-none"
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
