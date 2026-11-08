"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { resolveTicket } from "#/lib/actions/ticket";
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
  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Resolve Ticket</DialogTitle>
        </DialogHeader>
        <ResolveTicketForm ticketId={ticket.id} close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ResolveTicketForm({ ticketId, close }: { ticketId: string; close: () => void }) {
  const router = useRouter();
  const { isSaving, save } = useDialogSave();

  const form = useForm<ResolveTicketFormData>({
    resolver: zodResolver(ResolveTicketSchema),
    defaultValues: {
      resolve: "no",
      resolutionReason: "",
    },
  });

  const resolveValue = form.watch("resolve");

  const onSubmit = (data: ResolveTicketFormData) => {
    save(async () => {
      if (data.resolve === "yes") {
        const result = await resolveTicket(ticketId, data.resolutionReason);
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
      close();
    });
  };

  return (
    <Form {...form}>
      <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-6">
        <div className="flex flex-col">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="resolve"
              render={({ field }) => (
                <FormItem required className="col-span-2">
                  <FormLabel>Resolve</FormLabel>
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

            {resolveValue === "yes" && (
              <FormField
                control={form.control}
                name="resolutionReason"
                render={({ field }) => (
                  <FormItem required className="col-span-2">
                    <FormLabel>Resolution Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Explain how this ticket was resolved"
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
          <DialogClose asChild>
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button variant="brand" type="submit" disabled={isSaving} loading={isSaving}>
            Resolve Ticket
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
