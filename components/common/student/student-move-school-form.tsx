"use client";

import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import type { SchoolStudentTableData } from "#/components/common/student/columns";
import { MoveStudentToSchoolSchema } from "#/components/common/student/schemas";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
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
import { toast } from "#/components/ui/use-toast";
import {
  getHubSchoolsForStudentTransfer,
  getSchoolGroupsForStudentTransfer,
  moveStudentToSchool,
} from "#/lib/actions/student";
import { zodResolver } from "#/lib/zod-resolver";

type HubSchool = Awaited<ReturnType<typeof getHubSchoolsForStudentTransfer>>[number];
type SchoolGroup = Awaited<ReturnType<typeof getSchoolGroupsForStudentTransfer>>[number];

export default function StudentMoveSchoolForm({
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
  const [schools, setSchools] = useState<HubSchool[]>([]);
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const form = useForm<z.infer<typeof MoveStudentToSchoolSchema>>({
    resolver: zodResolver(MoveStudentToSchoolSchema),
    defaultValues: {
      studentId: student.id,
    },
  });

  const selectedSchoolId = form.watch("schoolId");

  useEffect(() => {
    if (!isOpen) return;

    form.reset({ studentId: student.id });
    setGroups([]);
    setLoadingSchools(true);
    void getHubSchoolsForStudentTransfer()
      .then((data) => {
        setSchools(data.filter((school) => school.id !== student.schoolId));
      })
      .finally(() => setLoadingSchools(false));
  }, [isOpen, student.id, student.schoolId]);

  useEffect(() => {
    if (!selectedSchoolId) {
      setGroups([]);
      return;
    }

    setLoadingGroups(true);
    void getSchoolGroupsForStudentTransfer(selectedSchoolId)
      .then((data) => setGroups(data))
      .finally(() => setLoadingGroups(false));
  }, [selectedSchoolId]);

  async function onSubmit(values: z.infer<typeof MoveStudentToSchoolSchema>) {
    const response = await moveStudentToSchool(values);
    if (!response.success) {
      toast({
        variant: "destructive",
        description: response.message ?? "Something went wrong, please try again",
      });
      return;
    }

    await revalidatePageAction(pathname);
    toast({ description: response.message });
    setIsOpen(false);
  }

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Move student to another school</DialogTitle>
          </DialogHeader>
          {children}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex items-start gap-2 rounded-lg border border-shamiri-red/30 bg-red-bg px-4 py-2 text-sm text-red-base">
              <Icons.info className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                Moving this student reassigns them to a new school, group and fellow. Their existing
                attendance records under{" "}
                <span className="font-semibold">
                  {student.school?.schoolName ?? "their old school"}
                </span>{" "}
                will be permanently deleted. This cannot be undone.
              </span>
            </div>
            <FormField
              control={form.control}
              name="schoolId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Destination school <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.resetField("assignedGroupId");
                    }}
                    value={field.value}
                    disabled={loadingSchools}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={loadingSchools ? "Loading schools..." : "Select a school"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {schools.length === 0 && !loadingSchools ? (
                        <div className="px-2 py-1.5 text-sm text-shamiri-text-grey">
                          No other schools available
                        </div>
                      ) : (
                        schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.schoolName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Group / Fellow <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedSchoolId || loadingGroups}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedSchoolId
                              ? "Select a school first"
                              : loadingGroups
                                ? "Loading groups..."
                                : "Select a group/fellow"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {groups.length === 0 && !loadingGroups && selectedSchoolId ? (
                        <div className="px-2 py-1.5 text-sm text-shamiri-text-grey">
                          No groups found in this school
                        </div>
                      ) : (
                        groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.groupName} · {group.leader.fellowName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="brand"
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                Move student
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
