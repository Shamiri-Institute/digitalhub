"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Prisma } from "@prisma/client";
import { usePathname } from "next/navigation";
import type React from "react";
import type { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AssignPointSupervisorSchema } from "#/app/(platform)/hc/schemas";
import { assignFellowSupervisor } from "#/app/(platform)/hc/schools/[visibleId]/fellows/actions";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import type { SchoolFellowTableData } from "#/components/common/fellow/columns";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "#/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";

export default function AssignFellowSupervisorDialog({
  supervisors,
  open,
  onOpenChange,
  children,
  fellow,
}: {
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      fellows: true;
    };
  }>[];
  children: React.ReactNode;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  fellow: SchoolFellowTableData | null;
}) {
  const pathname = usePathname();
  const form = useForm<z.infer<typeof AssignPointSupervisorSchema>>({
    resolver: zodResolver(AssignPointSupervisorSchema),
    defaultValues: {
      assignedSupervisorId: fellow?.supervisorId ?? undefined,
    },
  });

  const onSubmit = async (
    data: z.infer<typeof AssignPointSupervisorSchema>, // re-used: similar schema
  ) => {
    if (fellow) {
      const response = await assignFellowSupervisor({
        fellowId: fellow.id,
        supervisorId: data.assignedSupervisorId,
      });

      if (!response.success) {
        toast({
          description:
            response.message ?? "Something went wrong during submission, please try again",
        });
        return;
      }

      await revalidatePageAction(pathname).then(() => {
        toast({
          description: response.message,
        });
        form.reset();
        onOpenChange(false);
      });
    } else {
      toast({
        variant: "destructive",
        description: "Something went wrong. Fellow not found",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <span className="text-xl">Assign supervisor</span>
        </DialogHeader>
        {children}
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
                  onOpenChange(false);
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
