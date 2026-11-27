"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "#/components/ui/textarea";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { reopenQuestionnaire, verifyQuestionnaire } from "#/lib/actions/survey/copies";
import { ReopenQuestionnaireSchema } from "#/lib/actions/survey/schemas";
import { zodResolver } from "#/lib/zod-resolver";

type Copy = { id: string; serial: string };

export function CopyVerifyDialog({
  copy,
  seenEventId,
}: {
  copy: Copy;
  /** The newest history event the page shows, or null when it shows none. */
  seenEventId: number | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="w-full" onClick={() => setOpen(true)}>
        Verify copy
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <VerifyConfirm copy={copy} seenEventId={seenEventId} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function VerifyConfirm({
  copy,
  seenEventId,
  onDone,
}: {
  copy: Copy;
  seenEventId: number | null;
  onDone: () => void;
}) {
  const { isSaving, save } = useDialogSave();
  const verify = () =>
    save(async () => {
      const response = await verifyQuestionnaire({ questionnaireId: copy.id, seenEventId });
      toast({
        variant: response.success ? "default" : "destructive",
        description: response.message,
      });
      // A refusal means the copy changed behind this page, which has now refreshed to show the
      // change. Closing makes the viewer look again before verifying, rather than verifying
      // straight away against the refreshed page.
      onDone();
    });
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Verify copy <span className="font-mono">{copy.serial}</span>?
        </DialogTitle>
        <DialogDescription>
          Its answers lock. A scan of this copy that arrives later is kept aside, not read into it.
          Research can reopen it with a reason.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex justify-end gap-2">
        <DialogClose render={<Button variant="ghost" type="button" />}>Cancel</DialogClose>
        <Button type="button" onClick={verify} disabled={isSaving} loading={isSaving}>
          Verify copy
        </Button>
      </DialogFooter>
    </>
  );
}

export function CopyReopenDialog({
  copy,
  seenEventId,
}: {
  copy: Copy;
  seenEventId: number | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        Reopen
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <ReopenForm copy={copy} seenEventId={seenEventId} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReopenForm({
  copy,
  seenEventId,
  onDone,
}: {
  copy: Copy;
  seenEventId: number | null;
  onDone: () => void;
}) {
  const form = useForm<z.infer<typeof ReopenQuestionnaireSchema>>({
    resolver: zodResolver(ReopenQuestionnaireSchema),
    defaultValues: { questionnaireId: copy.id, reason: "", seenEventId },
  });

  const { isSaving, save } = useDialogSave();
  const onSubmit = (values: z.infer<typeof ReopenQuestionnaireSchema>) =>
    save(async () => {
      const response = await reopenQuestionnaire(values);
      toast({
        variant: response.success ? "default" : "destructive",
        description: response.message,
      });
      // As for verify: after a refusal the viewer looks at the refreshed copy before trying again.
      onDone();
    });

  return (
    <Form {...form}>
      <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-4">
        <DialogHeader>
          <DialogTitle>
            Reopen copy <span className="font-mono">{copy.serial}</span>?
          </DialogTitle>
          <DialogDescription>
            Its answers can be changed again, and it leaves verified exports until it&apos;s
            verified again.
          </DialogDescription>
        </DialogHeader>
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="The age on page 2 was misread" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className="flex justify-end gap-2">
          <DialogClose render={<Button variant="ghost" type="button" />}>Cancel</DialogClose>
          <Button type="submit" disabled={isSaving} loading={isSaving}>
            Reopen copy
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
