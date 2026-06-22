"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Icons } from "#/components/icons";
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
import { createEscalation, getTicketEscalationStatus } from "#/lib/actions/ticket";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";
import type { TicketData } from "./columns";

const EscalateTicketSchema = z.object({
  escalate: z.enum(["yes", "no"]),
  escalationReason: stringValidation("Escalation reason is required"),
});

type EscalateTicketFormData = z.infer<typeof EscalateTicketSchema>;

interface EscalateTicketDialogProps {
  ticket: TicketData | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EscalateTicketDialog({ ticket, open, onOpenChange }: EscalateTicketDialogProps) {
  const router = useRouter();
  const [isDisabled, setIsDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState<string>("");

  const form = useForm<EscalateTicketFormData>({
    resolver: zodResolver(EscalateTicketSchema),
    defaultValues: {
      escalate: "no",
      escalationReason: "",
    },
  });

  const escalateValue = form.watch("escalate");

  useEffect(() => {
    if (!open || !ticket?.id) return;

    const checkEscalationStatus = async () => {
      const result = await getTicketEscalationStatus(ticket.id);
      if (result.success && result.data) {
        setIsDisabled(!result.data.canEscalate);
        setDisabledReason(result.data.reason ?? "");
      } else if (ticket.status === "RESOLVED") {
        setIsDisabled(true);
        setDisabledReason("Ticket has already been resolved");
      }
    };

    void checkEscalationStatus();
  }, [open, ticket, ticket?.id]);

  useEffect(() => {
    if (!open) {
      form.reset();
      setIsDisabled(false);
      setDisabledReason("");
    }
  }, [open, form]);

  const onSubmit = async (data: EscalateTicketFormData) => {
    if (!ticket?.id) return;

    if (data.escalate === "yes") {
      const result = await createEscalation(ticket.id, data.escalationReason, ticket.category);
      if (!result.success) {
        toast({
          variant: "destructive",
          description: result.message ?? "Failed to escalate ticket",
        });
        return;
      }

      toast({
        description: "Ticket escalated successfully",
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
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Icons.ticket className="h-5 w-5 text-shamiri-new-blue" />
            <span>Escalate Ticket</span>
          </DialogTitle>
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
                  name="escalate"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>
                        Escalate <span className="text-shamiri-light-red">*</span>
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

                {escalateValue === "yes" && (
                  <FormField
                    control={form.control}
                    name="escalationReason"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          Escalation Reason <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Explain why this ticket needs to be escalated"
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
                Escalate Ticket
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
