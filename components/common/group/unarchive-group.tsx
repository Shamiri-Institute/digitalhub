import { usePathname } from "next/navigation";
import type React from "react";
import { type Dispatch, type SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "#/components/ui/dialog";
import { Form } from "#/components/ui/form";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { unarchiveInterventionGroup } from "#/lib/actions/group";
import { zodResolver } from "#/lib/zod-resolver";

const UnarchiveGroupSchema = z.object({});

export default function UnarchiveGroup({
  groupId,
  children,
  open,
  onOpenChange,
}: {
  groupId: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  const pathname = usePathname();
  const form = useForm<z.infer<typeof UnarchiveGroupSchema>>({
    resolver: zodResolver(UnarchiveGroupSchema),
  });

  const onSubmit = async (_data: z.infer<typeof UnarchiveGroupSchema>) => {
    const response = await unarchiveInterventionGroup(groupId);
    if (!response.success) {
      toast({
        description: response.message ?? "Something went wrong, please try again",
      });
      return;
    }
    toast({
      description: response.message,
    });
    await revalidatePageAction(pathname);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-5 text-base leading-6 font-medium">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <h2 className="text-xl font-bold">Confirm group unarchive</h2>
            </DialogHeader>
            {children}
            <div className="space-y-4 pt-2">
              <h3>Are you sure?</h3>
              <DialogAlertWidget
                label="This group will become active again and can be used for interventions."
                variant="destructive"
                separator={false}
              />
            </div>
            <Separator />
            <div className="space-y-6 pt-2">
              <DialogFooter className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={form.formState.isSubmitting}
                  loading={form.formState.isSubmitting}
                >
                  Unarchive
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
