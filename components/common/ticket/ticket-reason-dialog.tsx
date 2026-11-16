"use client";

import { useForm } from "react-hook-form";
import { TicketPriorityLevel } from "#/db/enums";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useDialogSave,
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
import { toast, toastOnError } from "#/components/ui/use-toast";
import { cancelTicket, changeTicketPriority, reopenTicket } from "#/lib/actions/ticket";
import type { z } from "zod";
import { ChangeTicketPrioritySchema } from "#/lib/actions/ticket/types";
import { zodResolver } from "#/lib/zod-resolver";
import type { TicketData } from "./columns";

// Reopen and cancel leave the priority as it is, so they validate only the reason.
const ReasonOnlySchema = ChangeTicketPrioritySchema.partial({ priority: true });
type TicketReasonInput = z.infer<typeof ReasonOnlySchema>;

const REASON_DIALOGS = {
  changePriority: {
    title: "Change priority",
    placeholder: "Explain why the priority is changing",
    schema: ChangeTicketPrioritySchema,
    asksPriority: true,
    destructive: false,
    submit: (ticketId: string, data: TicketReasonInput) =>
      changeTicketPriority(ticketId, ChangeTicketPrioritySchema.parse(data)),
  },
  reopen: {
    title: "Reopen ticket",
    placeholder: "Explain what still needs to be done",
    schema: ReasonOnlySchema,
    asksPriority: false,
    destructive: false,
    submit: (ticketId: string, data: TicketReasonInput) => reopenTicket(ticketId, data.reason),
  },
  cancel: {
    title: "Cancel ticket",
    placeholder: "Explain why this ticket is no longer needed",
    schema: ReasonOnlySchema,
    asksPriority: false,
    destructive: true,
    submit: (ticketId: string, data: TicketReasonInput) => cancelTicket(ticketId, data.reason),
  },
};

export type TicketReasonDialogKind = keyof typeof REASON_DIALOGS;

export function isTicketReasonDialogKind(kind: string): kind is TicketReasonDialogKind {
  return Object.hasOwn(REASON_DIALOGS, kind);
}

interface TicketReasonDialogProps {
  ticket: TicketData;
  kind: TicketReasonDialogKind;
  onOpenChange: (open: boolean) => void;
}

export function TicketReasonDialog({ ticket, kind, onOpenChange }: TicketReasonDialogProps) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{REASON_DIALOGS[kind].title}</DialogTitle>
        </DialogHeader>
        <TicketReasonForm ticket={ticket} kind={kind} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TicketReasonForm({
  ticket,
  kind,
  onDone,
}: {
  ticket: TicketData;
  kind: TicketReasonDialogKind;
  onDone: () => void;
}) {
  const dialog = REASON_DIALOGS[kind];
  const { isSaving, save } = useDialogSave();
  const form = useForm<TicketReasonInput>({
    resolver: zodResolver(dialog.schema),
    defaultValues: { priority: ticket.priority, reason: "" },
  });

  const onSubmit = (data: TicketReasonInput) => {
    save(async () => {
      const result = await dialog.submit(ticket.id, data);
      if (!result.success) {
        toast({ variant: "destructive", description: result.message });
        return;
      }
      toast({ description: result.message });
      onDone();
    });
  };

  return (
    <Form {...form}>
      <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-6">
        {dialog.asksPriority && (
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem required>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(TicketPriorityLevel).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem required>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder={dialog.placeholder} className="min-h-[100px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" type="button">
              Close
            </Button>
          </DialogClose>
          <Button
            variant={dialog.destructive ? "destructive" : "brand"}
            type="submit"
            disabled={isSaving}
            loading={isSaving}
          >
            {dialog.title}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
