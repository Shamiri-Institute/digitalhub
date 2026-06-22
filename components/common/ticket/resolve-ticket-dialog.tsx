"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { getTicketEscalationStatus, resolveTicket } from "#/lib/actions/ticket";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";
import type { TicketData } from "./columns";

const ResolveTicketSchema = z.object({
  resolve: z.enum(["yes", "no"]),
  resolutionReason: stringValidation("Resolution reason is required"),
});

type ResolveTicketFormData = z.infer<typeof ResolveTicketSchema>;

interface ResolveTicketDialogProps {
  ticket: TicketData | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResolveTicketDialog({ ticket, open, onOpenChange }: ResolveTicketDialogProps) {
  const router = useRouter();
  const [isDisabled, setIsDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState<string>("");

  const form = useForm<ResolveTicketFormData>({
    resolver: zodResolver(ResolveTicketSchema),
    defaultValues: {
      resolve: "no",
      resolutionReason: "",
    },
  });

  const resolveValue = form.watch("resolve");

  useEffect(() => {
    if (!open || !ticket?.id) return;

    const checkStatus = async () => {
      const result = await getTicketEscalationStatus(ticket.id);
      if (result.success && result.data) {
        if (result.data.isResolved) {
          setIsDisabled(true);
          setDisabledReason("Ticket has already been resolved");
        } else if (!result.data.canEscalate) {
          setIsDisabled(true);
          setDisabledReason("You have already escalated this ticket");
        }
      }
    };

    void checkStatus();
  }, [open, ticket, ticket?.id]);

  useEffect(() => {
    if (!open) {
      form.reset();
      setIsDisabled(false);
      setDisabledReason("");
    }
  }, [open, form]);

  const onSubmit = async (data: ResolveTicketFormData) => {
    if (!ticket?.id) return;

    if (data.resolve === "yes") {
      const result = await resolveTicket(ticket.id, data.resolutionReason);
      if (!result.success) {
        toast({
          variant: "destructive",
          description: result.message ?? "Failed to resolve ticket",
        });
        return;
      }

      toast({
        description: "Ticket resolved successfully",
      });
    }

    router.refresh();
    onOpenChange(false);
    form.reset();
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Resolve Ticket</DialogTitle>
        </DialogHeader>

        {isDisabled && (
          <div className="rounded-md bg-yellow-bg border border-yellow-border p-3">
            <p className="text-sm text-yellow-base font-medium">{disabledReason}</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="resolve"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>
                        Resolve <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        disabled={isDisabled}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {resolveValue === "yes" && (
                  <FormField
                    control={form.control}
                    name="resolutionReason"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          Resolution Reason <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Explain how this ticket was resolved"
                            className="min-h-[100px]"
                            disabled={isDisabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <Separator />

            <DialogFooter className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="brand"
                type="submit"
                disabled={form.formState.isSubmitting || isDisabled}
                loading={form.formState.isSubmitting}
              >
                Resolve Ticket
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
