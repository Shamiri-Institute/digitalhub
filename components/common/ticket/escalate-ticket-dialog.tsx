"use client";

import { useRouter } from "next/navigation";
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
import { createEscalation } from "#/lib/actions/ticket";
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

  const form = useForm<EscalateTicketFormData>({
    resolver: zodResolver(EscalateTicketSchema),
    defaultValues: {
      escalate: "no",
      escalationReason: "",
    },
  });

  const escalateValue = form.watch("escalate");

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
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Escalate Ticket</DialogTitle>
        </DialogHeader>

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
                disabled={form.formState.isSubmitting}
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
