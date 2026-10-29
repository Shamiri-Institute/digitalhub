"use client";

import { useState } from "react";
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
import { toast, toastOnError } from "#/components/ui/use-toast";
import { voidQuestionnaire } from "#/lib/actions/survey/print-runs";
import { VoidQuestionnaireSchema } from "#/lib/actions/survey/schemas";
import { zodResolver } from "#/lib/zod-resolver";

type Copy = { id: string; serial: string };

export function QuestionnaireVoidDialog({ copy }: { copy: Copy }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-shamiri-light-red"
        aria-label={`Void ${copy.serial}`}
        onClick={() => setOpen(true)}
      >
        Void
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <VoidForm copy={copy} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function VoidForm({ copy, onDone }: { copy: Copy; onDone: () => void }) {
  const form = useForm<z.infer<typeof VoidQuestionnaireSchema>>({
    resolver: zodResolver(VoidQuestionnaireSchema),
    defaultValues: { questionnaireId: copy.id, reason: "" },
  });

  const onSubmit = async (values: z.infer<typeof VoidQuestionnaireSchema>) => {
    const response = await voidQuestionnaire(values);
    toast({ variant: response.success ? "default" : "destructive", description: response.message });
    if (response.success) {
      onDone();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Void {copy.serial}?</DialogTitle>
          <DialogDescription>
            A void copy is never read back. Its serial and page codes are not reused.
          </DialogDescription>
        </DialogHeader>
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Torn in transit" />
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
            variant="destructive"
            disabled={form.formState.isSubmitting}
            loading={form.formState.isSubmitting}
          >
            Void copy
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
