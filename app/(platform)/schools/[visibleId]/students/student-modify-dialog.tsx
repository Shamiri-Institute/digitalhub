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

const FormSchema = z.object({
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
  condition: z.string().optional(),
  intervention: z.string().optional(),
  tribe: z.string().optional(),
  county: z.string().optional(),
  financialStatus: z.string().optional(),
  home: z.string().optional(),
  siblings: z.string().optional(),
  religion: z.string().optional(),
  groupName: z.string(),
  survivingParents: z.string().optional(),
  parentsDead: z.string().optional(),
  fathersEducation: z.string().optional(),
  mothersEducation: z.string().optional(),
  coCurricular: z.string().optional(),
  sports: z.string().optional(),
  phoneNumber: z
    .string({
      required_error: "Please enter the student's phone number.",
    })
    .optional(),
  mpesaNumber: z
    .string({
      required_error: "Please enter the student's MPESA number.",
    })
    .optional(),
  dropOutReason: z.string().optional(),
});

export type ModifyStudentData = z.infer<typeof FormSchema> & {
  visibleId?: string;
};

export function StudentModifyDialog({
  mode,
  student,
  info,
  schoolName,
  fellowName,
  children,
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
}) {
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
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
      condition: student?.condition ?? undefined,
      intervention: student?.intervention ?? undefined,
      tribe: student?.tribe ?? undefined,
      county: student?.county ?? undefined,
      financialStatus: student?.financialStatus ?? undefined,
      home: student?.home ?? undefined,
      siblings: student?.siblings ?? undefined,
      religion: student?.religion ?? undefined,
      groupName: student?.groupName ?? undefined,
      survivingParents: student?.survivingParents ?? undefined,
      parentsDead: student?.parentsDead ?? undefined,
      fathersEducation: student?.fathersEducation ?? undefined,
      mothersEducation: student?.mothersEducation ?? undefined,
      coCurricular: student?.coCurricular ?? undefined,
      sports: student?.sports ?? undefined,
      phoneNumber: student?.phoneNumber ?? undefined,
      mpesaNumber: student?.mpesaNumber ?? undefined,
      dropOutReason: student?.dropOutReason ?? undefined,
    },
  });

  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  async function onSubmit(data: ModifyStudentData) {
    const response = await modifyStudent({
      ...data,
      mode,
      visibleId: student?.visibleId,
    });
    if (response && (response as any).error) {
      console.error((response as any).error);
      toast({
        variant: "destructive",
        title: (response as any).error,
      });
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
              {schoolName}.
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
                  name="condition"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="condition">Condition</Label>
                      <Input
                        id="condition"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="TAU"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="intervention"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="intervention">Intervention</Label>
                      <Input
                        id="intervention"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="tribe"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="tribe">Tribe</Label>
                      <Input
                        id="tribe"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="Kikuyu"
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
                  name="financialStatus"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="financialStatus">Financial Status</Label>
                      <Input
                        id="financialStatus"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="home"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="home">Home</Label>
                      <Input
                        id="home"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="siblings"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="siblings">Siblings</Label>
                      <Input
                        id="siblings"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="religion"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="religion">Religion</Label>
                      <Input
                        id="religion"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="groupName"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="groupName">Group name</Label>
                      <Input
                        id="groupName"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="55_E45"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="survivingParents"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="survivingParents">
                        Surviving Parents
                      </Label>
                      <Input
                        id="survivingParents"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="parentsDead"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="parentsDead">Parents Dead</Label>
                      <Input
                        id="parentsDead"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="fathersEducation"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="fathersEducation">
                        Fathers Education
                      </Label>
                      <Input
                        id="fathersEducation"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="mothersEducation"
                  rules={{ required: false }}
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="mothersEducation">
                        Mothers Education
                      </Label>
                      <Input
                        id="mothersEducation"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="coCurricular"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="coCurricular">
                        Co-Curricular Activities
                      </Label>
                      <Input
                        id="coCurricular"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="sports"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="sports">Sports</Label>
                      <Input
                        id="sports"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="N/A"
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

              <div>
                <FormField
                  control={form.control}
                  name="mpesaNumber"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="mpesaNumber">MPESA Number</Label>
                      <Input
                        id="mpesaNumber"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="+254-700-000-0000"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              {(student.droppedOut || student?.droppedOutAt) && (
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
