import { usePathname } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ArchiveStudentSchema } from "#/app/(platform)/hc/schemas";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import type { SchoolStudentTableData } from "#/components/common/student/columns";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Form } from "#/components/ui/form";
import { toast } from "#/components/ui/use-toast";
import { archiveStudent } from "#/lib/actions/student";
import { zodResolver } from "#/lib/zod-resolver";

export default function StudentArchiveForm({
  student,
  isOpen,
  setIsOpen,
  children,
}: {
  student: SchoolStudentTableData;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const form = useForm<z.infer<typeof ArchiveStudentSchema>>({
    resolver: zodResolver(ArchiveStudentSchema),
    defaultValues: {
      studentId: student.id,
    },
  });

  async function onSubmit() {
    const response = await archiveStudent(form.getValues());
    if (!response.success) {
      toast({
        description: response.message ?? "Something went wrong, please try again",
      });
      return;
    }
    toast({
      description: response.message,
    });
    setIsOpen(false);
    await revalidatePageAction(pathname);
  }

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-5 text-base font-medium leading-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Archive student</DialogTitle>
          </DialogHeader>
          {children}
          <form onSubmit={form.handleSubmit(() => void onSubmit())} className="space-y-5">
            <p className="text-sm text-shamiri-text-grey">
              This student will be deactivated and removed from active lists, but their records will
              remain in the system. Only an administrator or support team member can restore them.
            </p>
            <DialogFooter className="flex justify-end">
              <Button
                className="text-shamiri-light-red hover:bg-red-bg"
                variant="ghost"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                Archive student
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
