"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { dropoutFellowWithReason } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { constants } from "#/tests/constants";

const FormSchema = z.object({
  reason: z.string({
    required_error: "Please select the email(s) to invite.",
  }),
});

export function FellowDropoutDialog({
  fellow,
  school,
  children,
}: {
  fellow: Prisma.FellowGetPayload<{}>;
  school: Prisma.SchoolGetPayload<{}>;
  children: React.ReactNode;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const response = await dropoutFellowWithReason(
      fellow.visibleId,
      school.visibleId,
      data.reason,
    );
    console.log({ response });

    toast({
      title: `Dropped out ${fellow.fellowName}`,
    });
  }

  return (
    <Dialog>
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
                  Drop out {fellow.fellowName}
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
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="reason">Reason</Label>
                      <Textarea
                        id="reason"
                        name="reason"
                        onChange={field.onChange}
                        defaultValue={field.value}
                        placeholder="e.g. Fellow is not interested in the program"
                        className="mt-1.5 resize-none bg-card"
                        data-testid={constants.ADD_MEMBERS_EMAILS}
                        data-1p-ignore="true"
                      />
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 pb-6">
              <Button variant="destructive" type="submit" className="w-full">
                Drop out {fellow.fellowName}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
