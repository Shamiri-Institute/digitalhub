"use client";

import { AssignPointSupervisorSchema } from "#/app/(platform)/hc/schemas";
import { assignSchoolPointSupervisor } from "#/app/(platform)/hc/schools/actions";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import { SchoolsDataContext } from "#/app/(platform)/hc/schools/context/schools-data-context";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "#/components/ui/dialog";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function AssignPointSupervisor({
  supervisors,
}: {
  supervisors: Prisma.SupervisorGetPayload<{}>[];
}) {
  const context = useContext(SchoolInfoContext);
  const schoolsContext = useContext(SchoolsDataContext);
  const form = useForm<z.infer<typeof AssignPointSupervisorSchema>>({
    resolver: zodResolver(AssignPointSupervisorSchema),
  });

  useEffect(() => {
    form.reset({
      assignedSupervisorId: context.school?.assignedSupervisorId ?? undefined,
    });
  }, [context.pointSupervisorDialog]);

  const onSubmit = async (
    data: z.infer<typeof AssignPointSupervisorSchema>,
  ) => {
    if (context.school) {
      const response = await assignSchoolPointSupervisor(
        context.school?.id,
        data,
      );

      if (!response.success) {
        toast({
          description:
            response.message ??
            "Something went wrong during submission, please try again",
        });
        return;
      }

      const copiedSchools = [...schoolsContext.schools];
      const index = copiedSchools.findIndex(
        (_school) => _school.id === context.school?.id,
      );
      if (index !== -1) {
        console.log(index);
        copiedSchools[index]!.assignedSupervisorId = data.assignedSupervisorId;
        copiedSchools[index]!.assignedSupervisor =
          supervisors.find(
            (supervisor) => supervisor.id === data.assignedSupervisorId,
          ) ?? null;
        schoolsContext.setSchools(copiedSchools);
      }

      toast({
        description: response.message,
      });

      form.reset();
      context.setPointSupervisorDialog(false);
    }
  };

  return (
    <Dialog
      open={context.pointSupervisorDialog}
      onOpenChange={context.setPointSupervisorDialog}
    >
      <DialogContent>
        <DialogHeader>
          <span className="text-xl">
            {context.school?.assignedSupervisorId !== null
              ? "Change point supervisor"
              : "Assign point supervisor"}
          </span>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-lg border border-blue-border bg-blue-bg px-4 py-2">
          <Icons.info className="h-4 w-4 text-shamiri-new-blue" />
          <span className="text-shamiri-new-blue">
            {context.school?.schoolName}
          </span>
        </div>
        <Separator />
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
            <Separator className="my-6" />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  context.setPointSupervisorDialog(false);
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
