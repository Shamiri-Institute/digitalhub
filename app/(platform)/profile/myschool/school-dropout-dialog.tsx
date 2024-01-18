"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { dropoutSchoolWithReason } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";

import { Icons } from "#/components/icons";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { School } from "@prisma/client";

const FormSchema = z.object({
  reason: z.string({
    required_error: "Please enter the drop out reason",
  }),
});

export function SchoolDropoutDialog({
  school,
  children,
}: {
  school: School;
  children: React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [otherOption, setOtherOption] = React.useState(false);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log("onSubmit", reason);
    const response = await dropoutSchoolWithReason(school.visibleId, reason);
    if (response.school) {
      toast({
        variant: "destructive",
        title: "School has been dropped out",
      });

      window.location.href = "/profile/myschool";
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
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error({ errors });
            })}
            className="overflow-hidden text-ellipsis"
          >
            <FormField
              control={form.control}
              name="reason"
              defaultValue={reason}
              render={({ field }) => (
                <input type="hidden" name="reason" value={field.value} />
              )}
            />

            <Separator />

            <div className="my-6 space-y-6">
              <div className="flex flex-col px-6">
                {/* clickable options such as lack of 'timeline conflict', 'lack of commitment' with a grayish background */}
                <h3 className="mb-2 text-lg font-bold text-brand">
                  Tell us why
                </h3>

                {!otherOption && (
                  <>
                    <DropoutReasonButton
                      label="Lack of commitment"
                      active={reason === "Lack of commitment"}
                      onClick={() => setReason("Lack of commitment")}
                    />

                    <DropoutReasonButton
                      label="Timeline conflict"
                      active={reason === "Timeline conflict"}
                      onClick={() => setReason("Timeline conflict")}
                    />

                    <DropoutReasonButton
                      label="Poor communication"
                      active={reason === "Poor communication"}
                      onClick={() => setReason("Poor communication")}
                    />

                    <DropoutReasonButton
                      label="Don't fully understand the program"
                      active={reason === "Don't fully understand the program"}
                      onClick={() =>
                        setReason("Don't fully understand the program")
                      }
                    />

                    <DropoutReasonButton
                      label="Other"
                      active={false}
                      onClick={() => {
                        setReason("");
                        setOtherOption(true);
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {otherOption && (
              <div className="my-6 space-y-6">
                <div className="px-6">
                  <button
                    className="flex items-center gap-0.5 text-sm font-semibold text-brand"
                    onClick={() => {
                      setOtherOption(false);
                    }}
                  >
                    <Icons.chevronLeft className="h-4" strokeWidth={2.5} />
                    <span>Go back</span>
                  </button>
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <div className="mt-3 grid w-full gap-1.5">
                        <Textarea
                          id="reason"
                          name="reason"
                          onChange={(event) => setReason(event.target.value)}
                          defaultValue={reason}
                          placeholder="Tell us why, write here..."
                          className="mt-1.5 resize-none bg-card"
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end px-6 pb-6">
              <Button variant="destructive" type="submit" className="w-full">
                Drop out {school.schoolName}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DropoutReasonButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div>
      <Button
        className={cn(
          "my-1 min-w-[220px] justify-start rounded-sm bg-[#ededed] font-semibold text-brand ",
          {
            "bg-brand text-[#ededed]": active,
          },
        )}
        variant="base"
        type="button"
        onClick={onClick}
      >
        {label}
      </Button>
    </div>
  );
}
