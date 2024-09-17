"use client";

import { AddNewStudentSchema } from "#/app/(platform)/hc/schemas";
import { addNewStudentToGroup } from "#/app/(platform)/hc/schools/[visibleId]/fellows/actions";
import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function AddStudentToGroup() {
  const context = useContext(FellowInfoContext);
  const schoolContext = useContext(SchoolInfoContext);
  const pathname = usePathname();

  const form = useForm<z.infer<typeof AddNewStudentSchema>>({
    resolver: zodResolver(AddNewStudentSchema),
  });

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

  return (
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
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
