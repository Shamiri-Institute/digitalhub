"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { modifyStudent } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Form, FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#/components/ui/sheet";
import { toast } from "#/components/ui/use-toast";
import { SHOW_DUPLICATE_ID_CHECKBOX } from "#/lib/constants";

const FormSchema = z.object({
  isTransfer: z.boolean().optional(),
  isDuplicateAdmissionNumber: z.boolean().optional(),
  fellowVisibleId: z.string({
    required_error: "Please enter the fellow's visible ID.",
  }),
  studentName: z.string({
    required_error: "Please enter the student's name.",
  }),
  supervisorVisibleId: z.string({
    required_error: "Please enter the supervisor's visible ID.",
  }),
  implementerVisibleId: z.string({
    required_error: "Please enter the implementer's visible ID.",
  }),
  schoolVisibleId: z.string({
    required_error: "Please enter the school's visible ID.",
  }),
  yearOfImplementation: z.number({
    required_error: "Please enter the year of implementation.",
  }),
  admissionNumber: z.string({
    required_error: "Please enter the student's admission number.",
  }),
  age: z
    .string({
      required_error: "Please enter the student's age.",
    })
    .optional(),
  gender: z.string({
    required_error: "Please enter the student's gender.",
  }),
  form: z.string(),
  stream: z.string().optional(),
  county: z.string().optional(),
  phoneNumber: z
    .string({
      required_error: "Please enter the student's phone number.",
    })
    .optional(),
  dropOutReason: z.string().optional(),
});

export type ModifyStudentData = z.infer<typeof FormSchema> & {
  visibleId?: string;
  groupId?: string;
};

export function StudentModifyDialog({
  mode,
  student,
  info,
  schoolName,
  fellowName,
  children,
  group,
}: {
  mode: "create" | "edit";
  student?: Prisma.StudentGetPayload<{
    include: {
      fellow: true;
      supervisor: true;
      implementer: true;
      school: true;
    };
  }>;
  info: {
    schoolVisibleId: string;
    fellowVisibleId: string;
    supervisorVisibleId: string;
    implementerVisibleId: string;
  };
  schoolName: string;
  fellowName: string;
  children: React.ReactNode;
  group?: {
    groupId: string;
    groupName: string;
  };
}) {
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      isTransfer: false,
      isDuplicateAdmissionNumber: false,
      fellowVisibleId: info.fellowVisibleId,
      supervisorVisibleId: info.supervisorVisibleId,
      implementerVisibleId: info.implementerVisibleId,
      schoolVisibleId: info.schoolVisibleId,
      studentName: student?.studentName ?? undefined,
      yearOfImplementation:
        student?.yearOfImplementation ?? new Date().getFullYear(),
      admissionNumber: student?.admissionNumber ?? undefined,
      age: student?.age?.toString() ?? undefined,
      gender: student?.gender ?? undefined,
      form: student?.form?.toString() ?? undefined,
      stream: student?.stream ?? undefined,
      county: student?.county ?? undefined,
      phoneNumber: student?.phoneNumber ?? undefined,
      dropOutReason: student?.dropOutReason ?? undefined,
    },
  });

  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  async function onSubmit(data: ModifyStudentData) {
    const response = await modifyStudent({
      ...data,
      mode,
      visibleId: student?.visibleId,
      groupId: group?.groupId,
    });

    if (response && (response as any).error) {
      console.error((response as any).error);
      toast({
        variant: "destructive",
        title: (response as any).error,
      });
      if ((response as any).action === SHOW_DUPLICATE_ID_CHECKBOX) {
        setShowDuplicateOverride(true);
        return;
      }
      return;
    }

    if (response) {
      console.log({ response });

      if (mode === "create") {
        toast({
          description: `Added ${data.studentName} to ${fellowName}'s group at ${schoolName}`,
        });
      } else if (mode === "edit") {
        toast({
          description: `Updated ${student?.studentName}'s info`,
        });
      }

      setIsSheetOpen(false);

      setShowDuplicateOverride(false);

      router.refresh();

      form.reset();
    } else {
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
    }
  }

  function onError(errors: any) {
    console.log({ errors });
  }

  const [showDuplicateOverride, setShowDuplicateOverride] =
    React.useState(false);

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-y-scroll" side="right">
        <SheetHeader>
          {mode === "create" && (
            <SheetTitle className="md:text-xl">Add a student</SheetTitle>
          )}
          {mode === "edit" && (
            <SheetTitle className="md:text-xl">
              {student?.studentName}
            </SheetTitle>
          )}
          {mode === "create" && (
            <SheetDescription>
              This student will be assigned to {fellowName}&apos;s group at{" "}
              {schoolName.trim()}: {group?.groupName || "N/A"}
            </SheetDescription>
          )}
          {mode === "edit" && (
            <SheetDescription>
              Shamiri ID: {student?.visibleId}
            </SheetDescription>
          )}
        </SheetHeader>

        <Form {...form}>
          <form
            id="modifyStudentForm"
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="overflow-hidden text-ellipsis px-1"
          >
            <div className="mt-6 space-y-6">
              {mode === "create" && (
                <div>
                  <FormField
                    control={form.control}
                    name="isTransfer"
                    render={({ field }) => (
                      <div className="mt-3 flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-[2px]"
                          id="isTransfer"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                        <Label htmlFor="isTransfer">
                          Mark as a student transfer from a different group
                        </Label>
                      </div>
                    )}
                  />
                </div>
              )}
              {mode === "create" && showDuplicateOverride && (
                <div>
                  <FormField
                    control={form.control}
                    name="isDuplicateAdmissionNumber"
                    render={({ field }) => (
                      <div className="mt-3 flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-[2px]"
                          id="isDuplicateAdmissionNumber"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                        <Label htmlFor="isDuplicateAdmissionNumber">
                          Mark if the student shares an admission number with
                          another student in the same school
                        </Label>
                      </div>
                    )}
                  />
                </div>
              )}
              <div>
                <FormField
                  control={form.control}
                  name="studentName"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="studentName">Name</Label>
                      <Input
                        id="studentName"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="Jomo Kenyatta"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>
              <div className="hidden">
                <input type="hidden" {...form.register("fellowVisibleId")} />
                <input
                  type="hidden"
                  {...form.register("supervisorVisibleId")}
                />
                <input
                  type="hidden"
                  {...form.register("implementerVisibleId")}
                />
                <input type="hidden" {...form.register("schoolVisibleId")} />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="admissionNumber"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="admissionNumber">Admission Number</Label>
                      <Input
                        id="admissionNumber"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="3691"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="age">
                        Age (as of{" "}
                        {student?.yearOfImplementation ||
                          new Date().getFullYear()}
                        )
                      </Label>
                      <Input
                        id="age"
                        type="number"
                        min={0}
                        className="mt-1.5 resize-none bg-card"
                        placeholder="23"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        name="gender"
                        defaultValue={student?.gender || field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={student?.gender || field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select gender
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                          <SelectItem value="O">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="form"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="form">Form</Label>
                      <Select
                        name="form"
                        defaultValue={
                          student?.form?.toString() || field?.value?.toString()
                        }
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={student?.form || field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select form
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Form 1</SelectItem>
                          <SelectItem value="2">Form 2</SelectItem>
                          <SelectItem value="3">Form 3</SelectItem>
                          <SelectItem value="4">Form 4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="stream"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="stream">Stream</Label>
                      <Input
                        id="stream"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="4East"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="county"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="county">County</Label>
                      <Input
                        id="county"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="Niarobi"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="+254-700-000-0000"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              {(student?.droppedOut || student?.droppedOutAt) && (
                <div>
                  <FormField
                    control={form.control}
                    name="dropOutReason"
                    render={({ field }) => (
                      <div className="mt-3 grid w-full gap-1.5">
                        <Label htmlFor="dropOutReason">Drop out reason</Label>
                        <Input
                          id="dropOutReason"
                          className="mt-1.5 resize-none bg-card"
                          placeholder="Student has entered the workforce"
                          {...field}
                        />
                      </div>
                    )}
                  />
                </div>
              )}

              {Object.keys(form.formState.errors).length > 0 && (
                <div
                  className="relative rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-500"
                  role="alert"
                >
                  <strong className="font-bold">
                    Please correct the following errors:
                  </strong>
                  <ul className="list-inside list-disc">
                    {Object.entries(form.formState.errors).map(
                      ([key, value]) => (
                        <li key={key}>
                          {key}: {value.message}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              <Button
                type="submit"
                form="modifyStudentForm"
                className="mt-4 w-full bg-shamiri-blue py-5 text-white transition-transform hover:bg-shamiri-blue-darker active:scale-95"
              >
                {mode === "create" && "Add student"}
                {mode === "edit" && `Update ${student?.studentName}`}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
