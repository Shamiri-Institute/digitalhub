"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { flagClinicalCaseForFollowUp } from "#/app/(platform)/sc/clinical/action";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  useDialogSave,
} from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toastOnError, useToast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";

const FormSchema = z.object({
  reason: stringValidation("Please enter the reason for flagging the case"),
});

export default function MarkCaseAsSpecial({
  caseId,
  reason,
  children,
}: {
  caseId: string;
  reason: string | null;
  children: React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <FlagCaseForm caseId={caseId} reason={reason} close={() => setDialogOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FlagCaseForm({
  caseId,
  reason,
  close,
}: {
  caseId: string;
  reason: string | null;
  close: () => void;
}) {
  const { toast } = useToast();
  const { isSaving, save } = useDialogSave();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      reason: reason || "",
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    save(async () => {
      try {
        const response = await flagClinicalCaseForFollowUp({
          caseId,
          reason: data.reason,
        });

        if (response.success) {
          toast({
            variant: "default",
            title: "Case flagged for follow up",
          });
          close();
        } else {
          toast({
            variant: "destructive",
            title: "Error flagging case for follow up. Please try again",
          });
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Error flagging case for follow up. Please try again",
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form
        noValidate
        id="modifyFlagAction"
        onSubmit={toastOnError(
          form.handleSubmit(onSubmit, (errors) => {
            console.error({ errors });
          }),
        )}
        className="overflow-hidden text-ellipsis"
      >
        <DialogHeader className="space-y-0 px-6 py-4">
          <DialogTitle className="text-base font-medium">
            Reason for Flagging Clinical Case
          </DialogTitle>
        </DialogHeader>
        <Separator />

        <div className="my-6 space-y-6">
          <div className="px-6">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <div className="mt-3 grid w-full gap-1.5">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    name="reason"
                    onChange={field.onChange}
                    defaultValue={reason ?? field.value}
                    placeholder="e.g. This case needs the police because..."
                    className="mt-1.5 resize-none bg-card"
                  />
                </div>
              )}
            />
          </div>
        </div>
        <div className="flex justify-end px-6 pb-6">
          <Button
            form="modifyFlagAction"
            type="submit"
            className="w-full"
            disabled={isSaving}
            loading={isSaving}
          >
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
}
