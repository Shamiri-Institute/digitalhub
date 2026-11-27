"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "#/components/ui/textarea";
import { toast, toastOnError, toastOnFailure } from "#/components/ui/use-toast";
import { reopenQuestionnaire, verifyQuestionnaire } from "#/lib/actions/survey/copies";
import { ReopenQuestionnaireSchema } from "#/lib/actions/survey/schemas";
import { zodResolver } from "#/lib/zod-resolver";

type Copy = { id: string; serial: string };

export function CopyVerifyDialog({ copy }: { copy: Copy }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="w-full" onClick={() => setOpen(true)}>
        Verify copy
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <VerifyConfirm copy={copy} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function VerifyConfirm({ copy, onDone }: { copy: Copy; onDone: () => void }) {
  const [isVerifying, startVerifying] = useTransition();
  const verify = () =>
    startVerifying(() =>
      toastOnFailure(async () => {
        const response = await verifyQuestionnaire({ questionnaireId: copy.id });
        toast({
          variant: response.success ? "default" : "destructive",
          description: response.message,
        });
        if (response.success) {
          onDone();
        }
      }),
    );
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
        <Button variant="ghost" type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" onClick={verify} disabled={isVerifying} loading={isVerifying}>
          Verify copy
        </Button>
      </DialogFooter>
    </>
  );
}

export function CopyReopenDialog({ copy }: { copy: Copy }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        Reopen
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <ReopenForm copy={copy} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReopenForm({ copy, onDone }: { copy: Copy; onDone: () => void }) {
  const form = useForm<z.infer<typeof ReopenQuestionnaireSchema>>({
    resolver: zodResolver(ReopenQuestionnaireSchema),
    defaultValues: { questionnaireId: copy.id, reason: "" },
  });

  const onSubmit = async (values: z.infer<typeof ReopenQuestionnaireSchema>) => {
    const response = await reopenQuestionnaire(values);
    toast({ variant: response.success ? "default" : "destructive", description: response.message });
    if (response.success) {
      onDone();
    }
  };

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
          <Button variant="ghost" type="button" onClick={onDone}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            loading={form.formState.isSubmitting}
          >
            Reopen copy
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
