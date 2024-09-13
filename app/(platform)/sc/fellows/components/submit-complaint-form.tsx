"use client";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import {
  Dialog,
  DialogContent,
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
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { toast } from "#/components/ui/use-toast";
import { COMPLAINT_TYPES } from "#/lib/app-constants/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { FellowComplaints } from "@prisma/client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { submitFellowComplaint } from "../../actions";
import { SubmitComplaintSchema } from "../../schemas";

const InputSchema = SubmitComplaintSchema.omit({
  fellowId: true,
});

export default function SubmitFellowComplaintForm({
  children,
  fellowName,
  fellowId,
  fellowPhoneNumber,
  pastComplaints,
}: {
  children: React.ReactNode;
  fellowName: string;
  fellowId: string;
  fellowPhoneNumber: string;
  pastComplaints: FellowComplaints[];
}) {
  const [open, setDialogOpen] = React.useState<boolean>(false);

  const form = useForm<z.infer<typeof InputSchema>>({
    resolver: zodResolver(InputSchema),
    defaultValues: {
      complaintType: "",
      additionalComments: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  async function onSubmit(data: z.infer<typeof InputSchema>) {
    const complaintData = { ...data, fellowId };

    const response = await submitFellowComplaint(complaintData);

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
      description: "Successfully submitted weekly evaluation",
    });

    form.reset();
    setDialogOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <h2 className="text-xl">Submit Complaint</h2>
            </DialogHeader>
            <DialogAlertWidget label={`${fellowName} • ${fellowPhoneNumber}`} />
            <div>
              <FormField
                control={form.control}
                name="complaintType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select complaint</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPLAINT_TYPES.map((complaintType) => (
                          <SelectItem key={complaintType} value={complaintType}>
                            {complaintType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additionalComments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional comments</FormLabel>
                    <FormControl>
                      <Input placeholder="shadcn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
