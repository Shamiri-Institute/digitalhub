"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { UserSearcher } from "#/components/common/users/user-searcher";
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
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { reassignTicket } from "#/lib/actions/ticket";
import {
  CreateTicketReassignmentSchema,
  type ReassignmentInitiatorRole,
} from "#/lib/actions/ticket/types";
import { zodResolver } from "#/lib/zod-resolver";
import type { UserSearchResult } from "#/types/user-search.types";
import type { TicketData } from "./columns";

const RECIPIENT_FIELD_ID = "reassign-recipient";

const ReassignFormSchema = CreateTicketReassignmentSchema.omit({
  ticketId: true,
});
type ReassignFormData = z.infer<typeof ReassignFormSchema>;

interface ReassignTicketDialogProps {
  ticket: TicketData | undefined;
  hubId?: string;
  role: ReassignmentInitiatorRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function searcherLabelOf(role: ReassignmentInitiatorRole) {
  if (role === "ADMIN") return "Admin";
  if (role === "HUB_COORDINATOR") return "Hub Coordinator";
  return "Clinical Lead";
}

export function ReassignTicketDialog({
  ticket,
  hubId,
  role,
  open,
  onOpenChange,
}: ReassignTicketDialogProps) {
  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Reassign Ticket to {searcherLabelOf(role)}
          </DialogTitle>
        </DialogHeader>
        <ReassignTicketForm
          ticketId={ticket.id}
          hubId={hubId}
          role={role}
          close={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReassignTicketForm({
  ticketId,
  hubId,
  role,
  close,
}: {
  ticketId: string;
  hubId?: string;
  role: ReassignmentInitiatorRole;
  close: () => void;
}) {
  const { isSaving, save } = useDialogSave();
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  const form = useForm<ReassignFormData>({
    resolver: zodResolver(ReassignFormSchema),
    defaultValues: { reassignedTo: "", reassignmentReason: "" },
  });

  const searcherLabel = searcherLabelOf(role);
  const hubMissing = role !== "ADMIN" && !hubId;

  const onSubmit = (data: ReassignFormData) => {
    save(async () => {
      const result = await reassignTicket({
        ticketId,
        reassignedTo: data.reassignedTo,
        reassignmentReason: data.reassignmentReason,
      });

      if (!result.success) {
        toast({
          variant: "destructive",
          description: result.message ?? "Failed to reassign ticket",
        });
        return;
      }

      const recipientName = selectedUser?.name ?? null;
      toast({
        description: recipientName
          ? `Ticket reassigned to "${recipientName}"`
          : (result.message ?? "Ticket reassigned successfully"),
      });
      close();
    });
  };

  const renderSearcher = (invalid: boolean) => {
    if (hubMissing) {
      return (
        <div className="rounded-md border bg-red-bg border-red-border p-3">
          <p className="text-sm text-red-base">
            Unable to reassign: no hub is assigned to your account. Please contact an administrator.
          </p>
        </div>
      );
    }

    const handleSelect = (user: UserSearchResult) => {
      setSelectedUser(user);
      form.setValue("reassignedTo", user.userId ?? "", {
        shouldValidate: true,
        shouldDirty: true,
      });
    };

    return (
      <UserSearcher
        role={role}
        id={RECIPIENT_FIELD_ID}
        invalid={invalid}
        hubId={hubId}
        onSelect={handleSelect}
        disabled={isSaving}
        selectedLabel={selectedUser?.name}
      />
    );
  };

  return (
    <Form {...form}>
      <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-6">
        <FormField
          control={form.control}
          name="reassignedTo"
          render={({ fieldState }) => (
            <FormItem required>
              <FormLabel htmlFor={RECIPIENT_FIELD_ID}>Select {searcherLabel}</FormLabel>
              {renderSearcher(fieldState.invalid)}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reassignmentReason"
          render={({ field }) => (
            <FormItem required>
              <FormLabel>Reassignment Reason</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Explain why this ticket is being reassigned"
                  className="min-h-[100px]"
                  disabled={isSaving}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <DialogFooter className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="brand"
            type="submit"
            disabled={hubMissing || isSaving}
            loading={isSaving}
          >
            Reassign Ticket
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
