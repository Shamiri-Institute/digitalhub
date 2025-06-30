"use client";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import {
  type ClinicalCases,
  supSubmitConsultClinicalexpert,
} from "#/app/(platform)/sc/clinical/action";
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

const ComplaintSchema = z.object({
  referral: z.string().min(1, "Referral is required"),
  consultant: z.string().min(1, "Consultant is required"),
  message: z.string(),
});

type ComplaintFormValues = z.infer<typeof ComplaintSchema>;

export default function ConsultClinicalExpert({
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
      consultant: "",
      message: "",
    },
  });

  const onSubmit = async (data: ComplaintFormValues) => {
    try {
      const response = await supSubmitConsultClinicalexpert({
        caseId: clinicalCase.id,
        name: data.consultant,
        comment: data.message,
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Clinical case referred successfully",
        });
        await revalidatePageAction("sc/clinical");
        setDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to refer clinical case",
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
          <h2>Consult clinical expert</h2>
        </DialogHeader>
        <DialogAlertWidget
          label={`${clinicalCase.pseudonym}`}
          separator={true}
        />
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="consultant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Select Consultant
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a consultant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dr-sara">
                            Clinical Expert
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-[100px] resize-none"
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
                  Submit
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
