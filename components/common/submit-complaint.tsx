import { zodResolver } from "@hookform/resolvers/zod";
import type { ImplementerRole, User } from "@prisma/client";
import { format } from "date-fns";
import { usePathname } from "next/navigation";
import type React from "react";
import type { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { SubmitComplaintSchema } from "#/components/common/schemas";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { submitFellowComplaint } from "#/lib/actions/fellow";
import { COMPLAINT_TYPES } from "#/lib/app-constants/constants";
import { getInitials } from "#/lib/utils";

export default function SubmitComplaint({
  id,
  children,
  open,
  onOpenChange,
  complaints,
  role: _role,
  mode: _mode = "add",
}: {
  id?: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  role: ImplementerRole;
  mode?: "view" | "add";
  complaints?: {
    id: string;
    complaint: string;
    comments?: string;
    createdBy?: User;
    createdAt: Date;
  }[];
}) {
  const pathname = usePathname();

  const form = useForm<z.infer<typeof SubmitComplaintSchema>>({
    resolver: zodResolver(SubmitComplaintSchema),
    defaultValues: {
      id,
    },
  });

  const onSubmit = async (data: z.infer<typeof SubmitComplaintSchema>) => {
    const response = await submitFellowComplaint(data);
    if (!response.success) {
      toast({
        description: response.message ?? "Something went wrong, please try again",
      });
      return;
    }
    toast({
      description: response.message,
    });
    revalidatePageAction(pathname).then(() => {
      form.reset();
      onOpenChange(false);
    });
  };

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-5 text-base font-medium leading-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Submit complaint</DialogTitle>
          </DialogHeader>
          {children}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="complaint"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Select complaint <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a complaint" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMPLAINT_TYPES.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
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
              name="comments"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Additional comments</FormLabel>
                  <FormControl>
                    <Textarea placeholder="" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button
                className="text-shamiri-new-blue"
                variant="ghost"
                type="button"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                Submit
              </Button>
            </DialogFooter>
          </form>
          <div className="flex flex-col divide-y">
            {complaints?.map((complaint) => {
              return (
                <div key={complaint.id} className="flex flex-col space-y-2 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(complaint.createdBy?.name ?? "")}
                        </AvatarFallback>
                      </Avatar>
                      <span>{complaint.createdBy?.name}</span>
                    </div>
                    <span className="text-sm text-shamiri-text-grey">
                      {format(complaint.createdAt, "dd MMM yyyy | hh:mm a")}
                    </span>
                  </div>
                  <span>{complaint.complaint}</span>
                  <span className="text-muted-foreground">{complaint.comments}</span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
