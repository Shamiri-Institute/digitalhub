"use client";
import { Button } from "#/components/ui/button";
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
import { Separator } from "#/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Textarea } from "#/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { FellowComplaints } from "@prisma/client";
import { Loader2 } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { submitFellowComplaint } from "../actions";
import { FellowComplaintSchema } from "../schema";

const InputSchema = FellowComplaintSchema.pick({ complaint: true });

export default function FellowComplaintForm({
  children,
  complaints = [],
  fellowId,
  supervisorId,
}: {
  children: React.ReactNode;
  complaints: FellowComplaints[];
  fellowId: string;
  supervisorId: string;
}) {
  const [open, setDialogOpen] = React.useState<boolean>(false);

  const form = useForm<z.infer<typeof InputSchema>>({
    resolver: zodResolver(InputSchema),
    defaultValues: {
      complaint: "",
    },
  });

  async function onSubmit(data: z.infer<typeof InputSchema>) {
    const complaint = {
      ...data,
      fellowId,
      supervisorId,
    };

    const response = await submitFellowComplaint(complaint);

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
      description: "Successfully added complaint",
    });

    form.reset();
    setDialogOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <div className="flex items-center gap-2 text-base font-medium">
                {complaints.length} Complaint
                {complaints.length > 1 || !complaints.length ? "s" : ""}
              </div>
            </DialogHeader>
            <Separator />
            <div className="my-6 space-y-6">
              <div className="px-6">
                <FormField
                  control={form.control}
                  name="complaint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Record Complaint</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="New complaint"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 py-6">
              <Button
                disabled={form.formState.isSubmitting}
                variant="brand"
                type="submit"
                className="w-full"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Add Complaint
              </Button>
            </div>
          </form>
        </Form>
        <div className="p-6">
          <h2 className="font-medium text-shamiri-dark-blue">
            Past Complaints
          </h2>
          {complaints?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created At</TableHead>
                  <TableHead>Complaint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((c, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{c.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell>{c.complaint}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div>No complaints recorded</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
