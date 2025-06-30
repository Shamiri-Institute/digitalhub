import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { CreateGroupSchema } from "#/components/common/group/schema";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { createInterventionGroup } from "#/lib/actions/group";
import { getSchoolInitials } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Prisma } from "@prisma/client";
import { usePathname } from "next/navigation";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

export default function CreateGroup({
  supervisors,
  school,
  groupCount,
  disabled,
}: {
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      fellows: true;
    };
  }>[];
  school: Prisma.SchoolGetPayload<{}>;
  groupCount: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const form = useForm<z.infer<typeof CreateGroupSchema>>({
    resolver: zodResolver(CreateGroupSchema),
    defaultValues: {
      schoolId: school.id,
      groupName: `${getSchoolInitials(school.schoolName)}_${groupCount + 1}`,
    },
  });
  const supervisorWatcher = form.watch("supervisorId");

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open]);

  const onSubmit = async (data: z.infer<typeof CreateGroupSchema>) => {
    const response = await createInterventionGroup(data);
    if (!response.success) {
      toast({
        variant: "destructive",
        description: response.message ?? "Something went wrong during submission, please try again",
      });
      return;
    }

    revalidatePageAction(pathname).then(() => {
      toast({
        description: response.message,
      });
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2">
          <Button variant="brand" className="flex gap-1" disabled={disabled}>
            <Icons.plusCircle className="h-4 w-4" />
            <span>New group</span>
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="w-2/5 max-w-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="mb-4">
              <span className="text-xl">Create new group</span>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex flex-col">
                <FormField
                  control={form.control}
                  name="groupName"
                  disabled={true}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator className="my-2" />
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    Assign a leader to this group
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <FormField
                    control={form.control}
                    name="supervisorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Select supervisor <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            form.resetField("fellowId");
                          }}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={"Select"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
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
                  <FormField
                    control={form.control}
                    name="fellowId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Select fellow <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                          disabled={!form.getValues("supervisorId")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={"Select"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {supervisorWatcher !== undefined
                              ? supervisors
                                  .find((supervisor) => supervisorWatcher === supervisor.id)!
                                  .fellows.map((fellow) => {
                                    return (
                                      <SelectItem key={fellow.id} value={fellow.id}>
                                        {fellow.fellowName}
                                      </SelectItem>
                                    );
                                  })
                              : []}
                            {supervisorWatcher !== undefined &&
                            supervisors.find((supervisor) => supervisorWatcher === supervisor.id)!
                              .fellows.length === 0 ? (
                              <SelectItem value={" "} disabled={true}>
                                Supervisor has no fellows assigned.
                              </SelectItem>
                            ) : null}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <Separator className="my-6" />
            <DialogFooter className="flex justify-end gap-2">
              <>
                <Button
                  variant="ghost"
                  type="button"
                  className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="brand"
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  loading={form.formState.isSubmitting}
                >
                  Submit
                </Button>
              </>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
