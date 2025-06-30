"use client";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { type ClinicalCases, updateStudentInfo } from "#/app/(platform)/sc/clinical/action";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
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
import { toast } from "#/components/ui/use-toast";
import { GENDER_OPTIONS } from "#/lib/constants";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const EditStudentSchema = z.object({
  studentName: stringValidation("Student name is required"),
  pseudonym: stringValidation("Pseudonym is required"),
  school: stringValidation("School is required"),
  gender: stringValidation("Gender is required"),
  shamiriId: stringValidation("Shamiri ID is required"),
  admissionNumber: stringValidation("Admission number is required"),
  classForm: stringValidation("Class/Form is required"),
  stream: stringValidation("Stream is required"),
  group: stringValidation("Group is required"),
  caseId: stringValidation("Case ID is required"),
  studentId: stringValidation("Student ID is required"),
});

export type EditStudentInfoFormValues = z.infer<typeof EditStudentSchema>;

export default function ViewEditClinicalCaseStudentInfo({
  children,
  clinicalCase,
}: {
  children: React.ReactNode;
  clinicalCase: ClinicalCases;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<EditStudentInfoFormValues>({
    resolver: zodResolver(EditStudentSchema),
    defaultValues: {
      studentName: clinicalCase.student.studentName || "",
      pseudonym: clinicalCase.pseudonym,
      school: clinicalCase.school,
      gender: clinicalCase.student.gender || "",
      shamiriId: clinicalCase.student.visibleId,
      admissionNumber: clinicalCase.student.admissionNumber || "",
      classForm: clinicalCase.student.form?.toString() || "",
      stream: clinicalCase.student.stream || "",
      group: clinicalCase.student.assignedGroup?.groupName || "",
      caseId: clinicalCase.id,
      studentId: clinicalCase.student.id,
    },
  });

  const onSubmit = async (data: EditStudentInfoFormValues) => {
    try {
      const response = await updateStudentInfo(data);

      if (response.success) {
        toast({
          title: "Success",
          description: response.message,
        });
        await revalidatePageAction("sc/clinical");
        setDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>View/edit student information</h2>
        </DialogHeader>
        <DialogAlertWidget label={clinicalCase.pseudonym} separator={true} />
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="studentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pseudonym"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pseudonym</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-gray-100" />
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
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDER_OPTIONS.map((g) => (
                              <SelectItem key={g} value={g}>
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="shamiriId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Shamiri ID</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-gray-100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admissionNumber"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>School Admission Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="classForm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class/Form</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" />
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
                    <FormLabel>Stream</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-gray-100" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button variant="ghost" type="button" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="brand"
                  type="submit"
                  loading={form.formState.isSubmitting}
                  disabled={form.formState.isSubmitting}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
