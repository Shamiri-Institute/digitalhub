import { zodResolver } from "@hookform/resolvers/zod";
import type { Prisma } from "@prisma/client";
import { usePathname } from "next/navigation";
import type React from "react";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { ReplaceGroupLeaderSchema } from "#/components/common/fellow/schema";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "#/components/ui/dialog";
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
import { replaceGroupLeader } from "#/lib/actions/fellow";

export default function ReplaceFellow({
  fellowId,
  groupId,
  open,
  onOpenChange,
  children,
  supervisors,
}: {
  fellowId: string;
  groupId: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  children?: React.ReactNode;
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      fellows: true;
    };
  }>[];
}) {
  const pathname = usePathname();
  const form = useForm<z.infer<typeof ReplaceGroupLeaderSchema>>({
    resolver: zodResolver(ReplaceGroupLeaderSchema),
  });
  const supervisorWatcher = form.watch("supervisorId");

  useEffect(() => {
    if (open) {
      form.reset({
        leaderId: fellowId,
        groupId,
      });
    }
  }, [open, fellowId, groupId, form]);

  const onSubmit = async (data: z.infer<typeof ReplaceGroupLeaderSchema>) => {
    const response = await replaceGroupLeader({
      oldLeaderId: data.leaderId,
      leaderId: data.newLeaderId,
      groupId,
    });

    if (!response.success) {
      toast({
        variant: "destructive",
        description: response.message ?? "Something went wrong during submission, please try again",
      });
      return;
    }

    await revalidatePageAction(pathname);
    toast({
      description: response.message,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-2/5 max-w-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="mb-4">
              <span className="text-xl">Replace fellow</span>
            </DialogHeader>
            {children}
            <div className="space-y-6">
              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    Assign group to replacement fellow
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
                            form.resetField("newLeaderId");
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
                    name="newLeaderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Select replacement fellow{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={"Select"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {supervisorWatcher !== undefined
                              ? supervisors
                                  .find((supervisor) => supervisorWatcher === supervisor.id)
                                  ?.fellows.filter(
                                    (fellow) => !fellow.droppedOut && fellow.id !== fellowId,
                                  )
                                  .map((fellow) => {
                                    return (
                                      <SelectItem key={fellow.id} value={fellow.id}>
                                        {fellow.fellowName}
                                      </SelectItem>
                                    );
                                  })
                              : []}
                            {supervisorWatcher !== undefined &&
                            supervisors.find((supervisor) => supervisorWatcher === supervisor.id)
                              ?.fellows.length === 0 ? (
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
              <Button
                variant="ghost"
                type="button"
                className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
                onClick={() => {
                  onOpenChange(false);
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
                Replace
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
