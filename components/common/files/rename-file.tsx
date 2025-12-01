"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import type { SchoolFilesTableData } from "#/components/common/files/columns";
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
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { updateUploadedSchoolFile } from "#/lib/actions/file";

const FormSchema = z.object({
  fileName: z.string({
      error: (issue) => issue.input === undefined ? "Please enter the file name" : undefined
}),
});

export default function RenameUploadedFile({
  open,
  onOpenChange,
  document,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  document: SchoolFilesTableData;
}) {
  const pathname = usePathname();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      fileName: document.fileName ?? "",
    },
  });

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    try {
      const response = await updateUploadedSchoolFile(document.id, values.fileName);
      if (!response.success) {
        toast({
          description:
            response.message ?? "Something went wrong during submission, please try again",
        });
        return;
      }

      revalidatePageAction(pathname).then(() => {
        toast({
          description: response.message,
        });
        form.reset();
        onOpenChange(false);
      });
    } catch (error) {
      console.error(error);
      toast({
        description: "Something went wrong during submission, please try again",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-xl font-bold">Edit document name</h2>
        </DialogHeader>
        <DialogAlertWidget>
          <div className="flex items-center gap-2">
            <span>{document.fileName}</span>
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue" />
            <span>{document.type}</span>
          </div>
        </DialogAlertWidget>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <div className="flex flex-col">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fileName"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          File Name <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
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
                className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                Update & save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
