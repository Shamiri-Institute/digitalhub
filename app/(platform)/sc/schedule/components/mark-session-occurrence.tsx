"use client";

import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { markSessionOccurrence } from "#/app/(platform)/sc/actions";
import { MarkSessionOccurrenceSchema } from "#/app/(platform)/sc/schemas";
import { SessionsContext } from "#/components/common/session/sessions-provider";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname } from "next/navigation";
import React, { Dispatch, SetStateAction, useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function MarkSessionOccurrence({
  children,
  id,
  isOpen,
  setIsOpen,
  defaultOccurrence,
}: {
  id: string;
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  defaultOccurrence: boolean | null;
}) {
  const pathname = usePathname();
  const { sessions, setSessions } = useContext(SessionsContext);

  const form = useForm<z.infer<typeof MarkSessionOccurrenceSchema>>({
    resolver: zodResolver(MarkSessionOccurrenceSchema),
    defaultValues: {
      sessionId: id,
      occurrence: defaultOccurrence ? "attended" : "unmarked",
    },
  });

  useEffect(() => {
    form.reset({
      sessionId: id,
      occurrence: defaultOccurrence ? "attended" : "unmarked",
    });
  }, [id, form, isOpen, defaultOccurrence]);

  const onSubmit = async (
    data: z.infer<typeof MarkSessionOccurrenceSchema>,
  ) => {
    const response = await markSessionOccurrence(data);

    if (!response.success) {
      toast({
        description:
          response.message ??
          "Something went wrong during submission, please try again",
      });
      return;
    } else {
      const sessionIndex = sessions.findIndex((session) => {
        return session.id === id;
      });

      const copiedSessions = [...sessions];
      if (
        sessionIndex !== -1 &&
        copiedSessions[sessionIndex] !== undefined &&
        response.data
      ) {
        copiedSessions[sessionIndex].occurred = response.data.occurred;
        setSessions(copiedSessions);
        console.log(copiedSessions[sessionIndex]);
      }
      toast({
        description: response.message,
      });
    }

    await revalidatePageAction(pathname);
    setIsOpen(false);
  };

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-2/5 max-w-none">
          <DialogHeader>
            <h2 className="text-lg font-bold">Mark session occurrence</h2>
          </DialogHeader>
          {children}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="occurrence"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Select occurrence</FormLabel>
                  <RadioGroup
                    defaultValue={field.value}
                    value={field.value}
                    name="attended"
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div className="relative">
                      <CustomIndicator className="green" label={"Attended"} />
                      <RadioGroupItem
                        value="attended"
                        id="mark_attended"
                        className="custom-radio border-gray-300 data-[state=checked]:border-shamiri-green"
                      ></RadioGroupItem>
                    </div>
                    <div className="relative">
                      <CustomIndicator className="blue" label={"Unmarked"} />
                      <RadioGroupItem
                        value="unmarked"
                        id="Unmarked_"
                        className="custom-radio border-gray-300  data-[state=checked]:border-shamiri-new-blue"
                      ></RadioGroupItem>
                    </div>
                  </RadioGroup>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button
                className="text-shamiri-new-blue hover:bg-blue-bg"
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                }}
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  );
}

function CustomIndicator({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <div className="custom-indicator pointer-events-none absolute inset-0 flex h-20 items-center pl-6">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "indicator h-4 w-4 rounded-full border border-gray-300 bg-white shadow",
            className,
          )}
        ></div>
        <span>{label}</span>
      </div>
    </div>
  );
}
