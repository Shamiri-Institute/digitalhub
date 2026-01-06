"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Supervisor } from "@prisma/client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AssignPointSupervisorSchema } from "#/app/(platform)/hc/schemas";
import {
  assignSchoolPointSupervisor,
  revalidatePageAction,
} from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import type { SchoolsTableData } from "./columns";

export default function AssignPointSupervisor({
  supervisors,
  open,
  setOpen,
  school,
}: {
  supervisors: Supervisor[];
  open: boolean;
  setOpen: (open: boolean) => void;
  school: SchoolsTableData | null;
}) {
  const pathname = usePathname();
  const form = useForm<z.infer<typeof AssignPointSupervisorSchema>>({
    resolver: zodResolver(AssignPointSupervisorSchema),
  });

  useEffect(() => {
    form.reset({
      assignedSupervisorId: school?.assignedSupervisorId ?? undefined,
    });
  }, [open, school, form]);

  const onSubmit = async (data: z.infer<typeof AssignPointSupervisorSchema>) => {
    if (school) {
      const response = await assignSchoolPointSupervisor(school.id, data);

      if (!response.success) {
        toast({
          description:
            response.message ?? "Something went wrong during submission, please try again",
        });
        return;
      }

      toast({
        description: response.message,
      });

      await revalidatePageAction(pathname);
      form.reset();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl">
            {school?.assignedSupervisorId !== null
              ? "Change point supervisor"
              : "Assign point supervisor"}
          </DialogTitle>
        </DialogHeader>
        <DialogAlertWidget label={school?.schoolName} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="assignedSupervisorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select point supervisor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Please select a supervisor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supervisors.map((supervisor) => {
                          return (
                            <SelectItem key={supervisor.id} value={supervisor.id}>
                              {supervisor.supervisorName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator className="my-3" />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Saving" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
