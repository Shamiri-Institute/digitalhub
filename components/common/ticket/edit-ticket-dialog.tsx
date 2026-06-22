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
import { toast } from "#/components/ui/use-toast";
import { getTicketEscalationStatus, resolveTicket } from "#/lib/actions/ticket";
import { zodResolver } from "#/lib/zod-resolver";
import type { TicketData } from "./columns";

const EditTicketSchema = z.object({
  status: z.enum(["resolve"]).optional(),
});

type EditTicketFormData = z.infer<typeof EditTicketSchema>;

interface EditTicketDialogProps {
  ticket: TicketData | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTicketDialog({ ticket, open, onOpenChange }: EditTicketDialogProps) {
  const router = useRouter();
  const [isDisabled, setIsDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState<string>("");

  const form = useForm<EditTicketFormData>({
    resolver: zodResolver(EditTicketSchema),
    defaultValues: {
      status: undefined,
    },
  });

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

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset();
      setIsDisabled(false);
      setDisabledReason("");
    }
    onOpenChange(next);
  };

  const onSubmit = async (data: EditTicketFormData) => {
    if (!ticket?.id) return;

    if (data.status === "resolve") {
      const result = await resolveTicket(ticket.id);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            <span>Edit Ticket</span>
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
                  name="status"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        disabled={isDisabled}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="resolve">Resolve ticket</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
