"use client";

import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { SchoolStudentTableData } from "#/components/common/student/columns";
import { StudentDetailsSchema } from "#/components/common/student/schemas";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import {
  checkExistingStudents,
  submitStudentDetails,
  transferStudentToGroup,
} from "#/lib/actions/student";
import { GENDER_OPTIONS } from "#/lib/constants";
import { cn } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { usePathname } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function StudentDetailsForm({
  open,
  onOpenChange,
  student,
  mode,
  children,
  schoolId,
  assignedGroupId,
  groupName,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  student?: SchoolStudentTableData;
  mode: "add" | "edit";
  children: React.ReactNode;
  schoolId: string | null;
  assignedGroupId?: string;
  groupName?: string;
}) {
  const pathname = usePathname();
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferOption, setTransferOption] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [matchedStudents, setMatchedStudents] = useState<
    Prisma.StudentGetPayload<{
      include: {
        assignedGroup: {
          include: {
            leader: true;
          };
        };
      };
    }>[]
  >([]);

  const form = useForm<z.infer<typeof StudentDetailsSchema>>({
    resolver: zodResolver(StudentDetailsSchema),
    defaultValues: getDefaultValues(),
  });

  function getDefaultValues() {
    return {
      mode,
      schoolId: schoolId ?? undefined,
      assignedGroupId,
      id: student?.id,
      studentName: student?.studentName ?? "",
      admissionNumber: student?.admissionNumber ?? "",
      gender: student?.gender ?? "",
      yearOfBirth: student?.yearOfBirth?.toString() ?? "",
      form: student?.form?.toString() ?? "",
      stream: student?.stream ?? "",
      phoneNumber: student?.phoneNumber ?? "",
    };
  }

  useEffect(() => {
    form.reset(getDefaultValues());
  }, [open, student, mode, assignedGroupId]);

  useEffect(() => {
    if (!transferDialog) {
      setTransferOption(undefined);
    }
  }, [transferDialog]);

  const checkMatchingAdmissions = async (
    values: z.infer<typeof StudentDetailsSchema>,
  ) => {
    if (schoolId !== null && values.admissionNumber !== undefined) {
      const students = await checkExistingStudents(
        values.admissionNumber,
        schoolId,
      );
      if (students.length > 0) {
        setMatchedStudents(students);
        setTransferDialog(true);
      } else {
        await onSubmit(values);
      }
    } else {
      toast({
        variant: "destructive",
        description:
          "Something went wrong during submission, school not found.",
      });
    }
  };

  const submitTransferOption = async () => {
    setLoading(true);
    if (transferOption === -1) {
      await onSubmit(form.getValues()).then(() => {
        setTransferDialog(false);
      });
    } else if (
      transferOption !== undefined &&
      transferOption >= 0 &&
      form.getValues("assignedGroupId") !== undefined
    ) {
      const data = matchedStudents[transferOption]!;
      const response = await transferStudentToGroup(
        data.id,
        form.getValues("assignedGroupId")!,
      );
      if (!response.success) {
        toast({
          variant: "destructive",
          description:
            response.message ??
            "Something went wrong during submission, please try again",
        });
        return;
      }

      revalidatePageAction(pathname).then(() => {
        toast({
          description: response.message,
        });
        form.reset();
        setTransferDialog(false);
        onOpenChange(false);
      });
    }
    setLoading(false);
    return;
  };

  const onSubmit = async (values: z.infer<typeof StudentDetailsSchema>) => {
    const response = await submitStudentDetails(values);
    if (!response.success) {
      toast({
        description:
          response.message ??
          "Something went wrong during submission, please try again",
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
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-xl font-bold">
              {mode === "edit"
                ? "Edit student information"
                : "Add student to group"}
            </h2>
          </DialogHeader>
          {children}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(
                mode === "edit" ? onSubmit : checkMatchingAdmissions,
              )}
            >
              <div className="space-y-6">
                <div className="flex flex-col">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="studentName"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>
                            Student name{" "}
                            <span className="text-shamiri-light-red">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Contact number{" "}
                            <span className="text-shamiri-light-red">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Gender{" "}
                            <span className="text-shamiri-light-red">*</span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[200px]">
                              {GENDER_OPTIONS.map((g) => (
                                <SelectItem key={g} value={g}>
                                  {g}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="yearOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Year of birth{" "}
                            <span className="text-shamiri-light-red">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder={"Enter year of birth"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="admissionNumber"
                      disabled={mode === "edit"}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Admission number{" "}
                            <span className="text-shamiri-light-red">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="form"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Class/form{" "}
                            <span className="text-shamiri-light-red">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="text" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stream"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Stream{" "}
                            <span className="text-shamiri-light-red">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="id"
                      render={({ field }) => (
                        <FormItem>
                          <Input type="hidden" defaultValue={field.value} />
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
                  className="text-shamiri-new-blue hover:text-shamiri-new-blue"
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
                  {mode === "edit" ? "Update & save" : "Submit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="lg:w-3/5 lg:max-w-none">
          <DialogHeader>
            <h2 className="text-xl font-bold">Confirm transfer student</h2>
          </DialogHeader>
          <DialogAlertWidget>
            <div className="flex flex-wrap items-center gap-2">
              <span className="capitalize">
                {form.getValues("studentName")?.toLowerCase()}
              </span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>Admission no. {form.getValues("admissionNumber")}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <div className="flex gap-1">
                <span>Form {form.getValues("form")}</span>
                <span>{form.getValues("stream")}</span>
              </div>
            </div>
          </DialogAlertWidget>
          <div className="flex flex-col gap-1">
            <span>Duplicate admission number found.</span>
            <span className="text-shamiri-text-dark-grey">
              Please select one of the students below if their information
              matches one of the options
            </span>
          </div>
          <RadioGroup
            className="flex flex-col gap-3"
            onValueChange={(value) => {
              setTransferOption(parseInt(value));
            }}
          >
            {matchedStudents.map((student, index) => {
              return (
                <label
                  key={student.id}
                  htmlFor={student.id}
                  className="flex gap-x-3 rounded-lg border bg-background-secondary px-4 py-3 lg:items-center"
                >
                  <RadioGroupItem
                    value={index.toString()}
                    id={student.id}
                    className="h-5 w-5 rounded border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue data-[state=checked]:text-white"
                  />
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <span className="capitalize">
                      {student.studentName?.toLowerCase()}
                    </span>
                    <span className="hidden h-1 w-1 rounded-full bg-gray-900 lg:block">
                      {""}
                    </span>
                    <span>Admission no. {student.admissionNumber}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-gray-900 lg:block">
                      {""}
                    </span>
                    <div className="flex gap-1">
                      <span>Form {student.form}</span>
                      <span>{student.stream}</span>
                    </div>
                    <span className="hidden h-1 w-1 rounded-full bg-gray-900 lg:block">
                      {""}
                    </span>
                    <span>Group {student.assignedGroup?.groupName}</span>
                  </div>
                </label>
              );
            })}
            <label
              htmlFor="none"
              className="flex items-center space-x-3 rounded-lg border bg-background-secondary px-4 py-3"
            >
              <RadioGroupItem
                value={"-1"}
                id="none"
                className="h-5 w-5 rounded border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue data-[state=checked]:text-white"
              />
              <span>None of the above</span>
            </label>
          </RadioGroup>
          {transferOption !== -1 && transferOption !== undefined ? (
            <div className="flex flex-col gap-y-4">
              <Separator />
              <span>Are you sure?</span>
              <div className="flex items-start gap-2 rounded-lg border border-shamiri-red/30 bg-red-bg px-4 py-2 text-red-base">
                <Icons.info className="mt-1 h-5 w-5 shrink-0" />
                <div>
                  {`This student already exists in ${matchedStudents[transferOption]?.assignedGroup?.leader.fellowName}’s group (${matchedStudents[transferOption]?.assignedGroup?.groupName}). If you continue you confirm that they will be transferred to group ${groupName}`}
                </div>
              </div>
            </div>
          ) : null}
          <Separator />
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="ghost"
              type="button"
              className={cn(
                transferOption === undefined
                  ? "text-shamiri-new-blue hover:bg-blue-bg"
                  : transferOption < 0
                    ? "text-shamiri-new-blue hover:bg-blue-bg"
                    : "text-shamiri-light-red hover:bg-red-bg",
              )}
              onClick={() => {
                setTransferDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={
                transferOption === undefined
                  ? "brand"
                  : transferOption > -1
                    ? "destructive"
                    : "brand"
              }
              type="button"
              onClick={() => {
                submitTransferOption();
              }}
              disabled={loading || transferOption === undefined}
              loading={loading}
            >
              {transferOption === undefined
                ? "Confirm transfer"
                : transferOption < 0
                  ? `Add ${form.getValues("studentName")} to group`
                  : "Confirm transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
