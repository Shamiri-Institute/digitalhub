"use client";

import { useRouter } from "next/navigation";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { createSurvey } from "#/lib/actions/survey";
import { CreateSurveySchema } from "#/lib/actions/survey/schemas";
import { zodResolver } from "#/lib/zod-resolver";

type FormValues = z.infer<typeof CreateSurveySchema>;

interface CreateSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateSurveyDialog({ open, onOpenChange }: CreateSurveyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lg:w-2/5 lg:max-w-none">
        <CreateSurveyForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CreateSurveyForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateSurveySchema),
    defaultValues: { title: "", code: "", description: "" },
  });

  const onSubmit = async (values: FormValues) => {
    const response = await createSurvey(values);
    if (!response.success || !response.data) {
      toast({ variant: "destructive", description: response.message });
      return;
    }
    toast({ description: response.message });
    onDone();
    router.push(`/admin/surveys/${response.data.surveyId}`);
  };

  return (
    <Form {...form}>
      <form onSubmit={toastOnError(form.handleSubmit(onSubmit))}>
        <DialogHeader>
          <DialogTitle className="text-xl">New survey</DialogTitle>
          <DialogDescription>It starts with an empty draft, version 1.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>
                  Title <span className="text-shamiri-light-red">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Code <span className="text-shamiri-light-red">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} className="uppercase" />
                </FormControl>
                <FormDescription>Printed on every copy, such as WB27</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="col-span-3">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Separator className="mb-4" />
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
            onClick={onDone}
          >
            Cancel
          </Button>
          <Button
            className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
            type="submit"
            disabled={form.formState.isSubmitting}
            loading={form.formState.isSubmitting}
          >
            Create survey
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
