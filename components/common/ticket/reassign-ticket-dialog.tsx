"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { UserSearcher } from "#/components/common/users/user-searcher";
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
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
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

export function ReassignTicketDialog({
  ticket,
  hubId,
  role,
  open,
  onOpenChange,
}: ReassignTicketDialogProps) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );

  const form = useForm<ReassignFormData>({
    resolver: zodResolver(ReassignFormSchema),
    defaultValues: { reassignedTo: "", reassignmentReason: "" },
  });

  const isAdmin = role === "ADMIN";
  const isHubCoordinator = role === "HUB_COORDINATOR";
  const searcherLabel = isAdmin
    ? "Admin"
    : isHubCoordinator
      ? "Hub Coordinator"
      : "Clinical Lead";
  const hubMissing = !isAdmin && !hubId;

  const resetForm = () => {
    form.reset();
    setSelectedUser(null);
  };

  const onSubmit = async (data: ReassignFormData) => {
    if (!ticket?.id) return;

    const result = await reassignTicket({
      ticketId: ticket.id,
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
    router.refresh();
    onOpenChange(false);
    resetForm();
  };

  if (!ticket) return null;

  const renderSearcher = (invalid: boolean) => {
    if (hubMissing) {
      return (
        <div className="rounded-md border bg-red-bg border-red-border p-3">
          <p className="text-sm text-red-base">
            Unable to reassign: no hub is assigned to your account. Please
            contact an administrator.
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
        disabled={form.formState.isSubmitting}
        selectedLabel={selectedUser?.name}
      />
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Reassign Ticket to {searcherLabel}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="reassignedTo"
              render={({ fieldState }) => (
                <FormItem>
                  <FormLabel htmlFor={RECIPIENT_FIELD_ID}>
                    Select {searcherLabel}{" "}
                    <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  {renderSearcher(fieldState.invalid)}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reassignmentReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reassignment Reason{" "}
                    <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Explain why this ticket is being reassigned"
                      className="min-h-[100px]"
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                type="submit"
                disabled={hubMissing || form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                Reassign Ticket
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
