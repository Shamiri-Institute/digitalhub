"use client";

import { AddNewStudentSchema } from "#/app/(platform)/hc/schemas";
import {
  addNewStudentToGroup,
  checkExistingStudents,
  transferStudentToGroup,
} from "#/app/(platform)/hc/schools/[visibleId]/fellows/actions";
import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
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
import { cn } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function AddStudentToGroup() {
  const context = useContext(FellowInfoContext);
  const schoolContext = useContext(SchoolInfoContext);
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
  const pathname = usePathname();

  const form = useForm<z.infer<typeof AddNewStudentSchema>>({
    resolver: zodResolver(AddNewStudentSchema),
  });

  const checkMatchingAdmissions = async (
    values: z.infer<typeof AddNewStudentSchema>,
  ) => {
    const students = await checkExistingStudents(values);
    if (students.length > 0) {
      setMatchedStudents(students);
      setTransferDialog(true);
    } else {
      await onSubmit(values);
    }
  };

  const submitTransferOption = async () => {
    setLoading(true);
    if (transferOption === -1) {
      await onSubmit(form.getValues()).then(() => {
        setTransferDialog(false);
      });
    } else if (transferOption !== undefined && transferOption >= 0) {
      const data = matchedStudents[transferOption]!;
      const response = await transferStudentToGroup(
        data.id,
        form.getValues("assignedGroupId"),
      );
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
        setTransferDialog(false);
        context.setAddStudentDialog(false);
      });
    }
    setLoading(false);
    return;
  };

  const onSubmit = async (values: z.infer<typeof AddNewStudentSchema>) => {
    const response = await addNewStudentToGroup(values);
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
      context.setAddStudentDialog(false);
    });
  };

  useEffect(() => {
    if (context.fellow && context.fellow.groupId && schoolContext.school) {
      form.reset({
        assignedGroupId: context.fellow.groupId,
        schoolId: schoolContext.school.id,
      });
    }
  }, [context.addStudentDialog, context.fellow]);

  useEffect(() => {
    setTransferOption(undefined);
  }, [transferDialog]);

  return (
    <>
      <Dialog
        open={context.addStudentDialog}
        onOpenChange={context.setAddStudentDialog}
      >
        <DialogContent>
          <DialogHeader>
            <h2 className="text-xl font-bold">Add new student</h2>
          </DialogHeader>
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>{context.fellow?.groupName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>{schoolContext.school?.schoolName}</span>
            </div>
          </DialogAlertWidget>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(checkMatchingAdmissions)}>
              <div className="space-y-6">
                <div className="flex flex-col">
                  <div className="grid grid-cols-2 gap-4">
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
                              {["Male", "Female", "Other"].map((g) => (
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
                              type="number"
                              max={2099}
                              min={1900}
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            School admission number{" "}
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
                            <Input {...field} />
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
                      name="assignedGroupId"
                      render={({ field }) => (
                        <FormItem>
                          <Input type="hidden" value={field.value} />
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
                    context.setAddStudentDialog(false);
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
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="w-1/2 max-w-none">
          <DialogHeader>
            <h2 className="text-xl font-bold">Confirm transfer student</h2>
          </DialogHeader>
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>{form.getValues("studentName")}</span>
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
                  className="flex items-center space-x-3 rounded-lg border bg-background-secondary px-4 py-3"
                >
                  <RadioGroupItem
                    value={index.toString()}
                    id={student.id}
                    className="h-5 w-5 rounded border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue data-[state=checked]:text-white"
                  />
                  <span>{student.studentName}</span>
                  <span className="h-1 w-1 rounded-full bg-gray-900">{""}</span>
                  <span>Admission no. {student.admissionNumber}</span>
                  <span className="h-1 w-1 rounded-full bg-gray-900">{""}</span>
                  <div className="flex gap-1">
                    <span>Form {student.form}</span>
                    <span>{student.stream}</span>
                  </div>
                  <span className="h-1 w-1 rounded-full bg-gray-900">{""}</span>
                  <span>Group {student.assignedGroup?.groupName}</span>
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
                  {`This student already exists in ${matchedStudents[transferOption]?.assignedGroup?.leader.fellowName}’s group (${matchedStudents[transferOption]?.assignedGroup?.groupName}). If you continue you confirm that they will be transferred to group ${context.fellow?.groupName}`}
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

const columns: ColumnDef<
  Prisma.StudentGetPayload<{
    include: {
      assignedGroup: true;
      _count: {
        select: {
          clinicalCases: true;
        };
      };
    };
  }>
>[] = [
  {
    accessorKey: "studentName",
    id: "Student name",
    header: "Student name",
  },
  {
    header: "Group name",
    id: "Group name",
    accessorKey: "assignedGroup.groupName",
  },
  {
    header: "Shamiri ID",
    id: "Shamiri ID",
    accessorKey: "visibleId",
  },
  // TODO: Add birthDate column to students table
  {
    header: "Age",
    id: "Age",
    accessorFn: (row) => {
      return row.age + " yrs";
    },
  },
  // TODO: Get clinical cases and display number
  {
    header: "Clinical cases",
    id: "Clinical cases",
    accessorFn: (row) => {
      return row._count.clinicalCases;
    },
  },
];
