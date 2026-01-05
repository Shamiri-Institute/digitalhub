import { zodResolver } from "@hookform/resolvers/zod";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { SubmitComplaintSchema } from "#/app/(platform)/hc/schemas";
import { submitSupervisorComplaint } from "#/app/(platform)/hc/supervisors/actions";
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
import { Input } from "#/components/ui/input";
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
import { SCHOOL_DROPOUT_REASONS } from "#/lib/app-constants/constants";

export default function SubmitComplaint({
  supervisorId,
  children,
  isOpen,
  setIsOpen,
}: {
  supervisorId?: string;
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const form = useForm<z.infer<typeof SubmitComplaintSchema>>({
    resolver: zodResolver(SubmitComplaintSchema),
  });

  const onSubmit = async (data: z.infer<typeof SubmitComplaintSchema>) => {
    const response = await submitSupervisorComplaint(data);
    if (!response.success) {
      toast({
        description: response.message ?? "Something went wrong, please try again",
      });
      return;
    }
    toast({
      description: response.message,
    });
    form.reset();
    setIsOpen(false);
  };

  useEffect(() => {
    form.reset({
      supervisorId,
    });
  }, [supervisorId, isOpen]);

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                      {SCHOOL_DROPOUT_REASONS.map((reason) => (
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
            <FormField
              control={form.control}
              name="supervisorId"
              render={({ field }) => (
                <FormItem>
                  <Input id="supervisorId" name="supervisorId" type="hidden" value={field.value} />
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
                  setIsOpen(false);
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
        </DialogContent>
      </Dialog>
    </Form>
  );
}
