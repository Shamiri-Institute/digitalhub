"use client";

import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AssignPointSupervisorSchema } from "#/app/(platform)/hc/schemas";
import { assignSchoolPointSupervisor } from "#/app/(platform)/hc/schools/actions";
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
import { toast, toastOnError } from "#/components/ui/use-toast";
import { zodResolver } from "#/lib/zod-resolver";
import type { SchoolsTableData } from "./columns";
import type { supervisor } from "#/db/schema";

type AssignPointSupervisorProps = {
  supervisors: Pick<typeof supervisor.$inferSelect, "id" | "supervisorName">[];
  open: boolean;
  setOpen: (open: boolean) => void;
  school: SchoolsTableData | null;
};

export default function AssignPointSupervisor(props: AssignPointSupervisorProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.setOpen}>
      <DialogContent>
        <AssignPointSupervisorForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function AssignPointSupervisorForm({ supervisors, setOpen, school }: AssignPointSupervisorProps) {
  const form = useForm<z.infer<typeof AssignPointSupervisorSchema>>({
    resolver: zodResolver(AssignPointSupervisorSchema),
    defaultValues: { assignedSupervisorId: school?.assignedSupervisorId ?? undefined },
  });

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

      form.reset();
      setOpen(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">
          {school?.assignedSupervisorId !== null
            ? "Change point supervisor"
            : "Assign point supervisor"}
        </DialogTitle>
      </DialogHeader>
      <DialogAlertWidget label={school?.schoolName} />
      <Form {...form}>
        <form onSubmit={toastOnError(form.handleSubmit(onSubmit))}>
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
    </>
  );
}
