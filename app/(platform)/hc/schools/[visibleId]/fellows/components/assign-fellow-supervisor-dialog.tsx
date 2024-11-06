"use client";

import { AssignPointSupervisorSchema } from "#/app/(platform)/hc/schemas";
import { assignFellowSupervisor } from "#/app/(platform)/hc/schools/[visibleId]/fellows/actions";
import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { usePathname } from "next/navigation";
import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function AssignFellowSupervisorDialog({
  supervisors,
}: {
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      fellows: true;
    };
  }>[];
}) {
  const pathname = usePathname();
  const context = useContext(FellowInfoContext);
  const form = useForm<z.infer<typeof AssignPointSupervisorSchema>>({
    resolver: zodResolver(AssignPointSupervisorSchema),
  });

  useEffect(() => {
    form.reset({
      assignedSupervisorId: context.fellow?.supervisorId ?? undefined,
    });
  }, [context.assignSupervisor]);

  const onSubmit = async (
    data: z.infer<typeof AssignPointSupervisorSchema>, // re-used: similar schema
  ) => {
    if (context.fellow) {
      const response = await assignFellowSupervisor({
        fellowId: context.fellow.id,
        supervisorId: data.assignedSupervisorId,
      });

      if (!response.success) {
        toast({
          description:
            response.message ??
            "Something went wrong during submission, please try again",
        });
        return;
      }

      revalidatePageAction(pathname).then(() => {
        toast({
          description: response.message,
        });
        form.reset();
        context.setAssignSupervisor(false);
      });
    }
  };

  return (
    <Dialog
      open={context.assignSupervisor}
      onOpenChange={context.setAssignSupervisor}
    >
      <DialogContent>
        <DialogHeader>
          <span className="text-xl">Assign supervisor</span>
        </DialogHeader>
        <DialogAlertWidget label={context.fellow?.fellowName} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="assignedSupervisorId"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Please select a supervisor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supervisors.map((supervisor) => {
                          return (
                            <SelectItem
                              key={supervisor.id}
                              value={supervisor.id}
                            >
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
                  context.setAssignSupervisor(false);
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
