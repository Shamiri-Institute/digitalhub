"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { dropoutStudentWithReason } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { StudentWithFellow } from "#/types/prisma";
import { Loader2 } from "lucide-react";

const FormSchema = z
  .object({
    reason: z.string(),
    other_reason: z.string(),
  })
  .partial()
  .refine(
    (val) => {
      if (val.reason === "other" && !val.other_reason) {
        return false;
      }
      return true;
    },
    {
      message:
        "Please select one of the options. If you select other please fill in a reason in the input field",
      path: ["other_reason"],
    },
  );

export function StudentDropoutDialog({
  student,
  children,
}: {
  student: StudentWithFellow;
  children: React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      reason: "",
      other_reason: "",
    },
  });

  const reasonRadioValue = form.watch("reason", "");

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const reason = data.reason === "other" ? data.other_reason : data.reason;

    if (!reason) {
      toast({
        variant: "destructive",
        title: "Submission error",
        description: "The reason must be specified",
      });
      return;
    }

    const response = await dropoutStudentWithReason(
      student.visibleId,
      student.school.visibleId,
      student.fellow.visibleId,
      reason,
    );
    if (response?.error) {
      toast({
        variant: "destructive",
        title: response?.error,
      });
      return;
    }

    if (response) {
      toast({
        title: `Dropped out ${student.studentName}`,
      });

      setDialogOpen(false);

      form.reset();
    } else {
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium">
                  Drop out {student.studentName}
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
                    <FormItem>
                      <FormLabel>Reason for dropping out</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(e) => {
                            if (form.getValues("other_reason")) {
                              form.resetField("other_reason");
                            }
                            field.onChange(e);
                          }}
                          defaultValue={field.value}
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="mistrust/ethical concerns" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Mistrust/Ethical Concerns
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="other committments" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Other commitments
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="transferred schools" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Transferred schools
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="other" />
                            </FormControl>
                            <FormLabel className="font-normal">Other</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="px-6">
              <FormField
                control={form.control}
                name="other_reason"
                disabled={reasonRadioValue !== "other"}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Other reason" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end px-6 py-6">
              <Button variant="destructive" type="submit" className="w-full">
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Drop out {student.studentName}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
