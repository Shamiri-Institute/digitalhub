"use client";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";

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

const ComplaintSchema = z.object({
  referral: z.string().min(1, "Referral is required"),
});

type ComplaintFormValues = z.infer<typeof ComplaintSchema>;

export default function ReferClinicalCase({
  children,
  clinicalCase,
}: {
  children: React.ReactNode;
  clinicalCase: ClinicalCases;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(ComplaintSchema),
    defaultValues: {
      referral: clinicalCase.referralFrom,
    },
  });

  const onSubmit = async (data: ComplaintFormValues) => {
    try {
      const response = {
        success: true,
        message: "Clinical case referred successfully",
      };

      if (response.success) {
        toast({
          title: "Success",
          description: "Clinical case referred successfully",
        });
        await revalidatePageAction("hc/reporting/fellow-reports/complaints");
        setDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to refer clinical case",
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

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>Refer clinical case</h2>
        </DialogHeader>
        <DialogAlertWidget
          label={`${clinicalCase.pseudonym}`}
          separator={true}
        />
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date of Complaint</label>
              <p className="text-gray-600">{clinicalCase.dateAdded}</p>
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="referral"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-[150px] resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
