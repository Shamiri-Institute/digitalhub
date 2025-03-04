"use client";

import { flagClinicalCaseForFollowUp } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { useToast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      reason: reason || "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      await flagClinicalCaseForFollowUp({
        caseId,
        reason: data.reason,
      });

      toast({
        variant: "default",
        title: "Case flagged for follow up",
      });
      form.reset();
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error flagging case for follow up. Please try again",
      });
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form
            id="modifyFlagAction"
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error({ errors });
            })}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium">
                  Reason for Flagging Clinical Case
                </span>
              </div>
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
                variant="brand"
                type="submit"
                className="w-full"
              >
                Submit
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
