"use client";

import { StudentDetailsSchema } from "#/app/(platform)/hc/schemas";
import { SchoolStudentTableData } from "#/app/(platform)/hc/schools/[visibleId]/students/components/columns";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
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
import { submitStudentDetails } from "#/lib/actions/student";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname } from "next/navigation";
import { Dispatch, SetStateAction, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function StudentDetailsForm({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  student: SchoolStudentTableData;
}) {
  const pathname = usePathname();

  const form = useForm<z.infer<typeof StudentDetailsSchema>>({
    resolver: zodResolver(StudentDetailsSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        id: student.id,
        studentName: student.studentName ?? undefined,
        admissionNumber: student.admissionNumber ?? undefined,
        gender: student.gender ?? undefined,
        yearOfBirth: student.yearOfBirth ?? undefined,
        form: student.form ?? undefined,
        stream: student.stream ?? undefined,
        phoneNumber: student.phoneNumber ?? undefined,
      });
    }
  }, [open, student, form]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-xl font-bold">Edit student information</h2>
        </DialogHeader>
        <DialogAlertWidget>
          <div className="flex items-center gap-2">
            <span>{student.studentName}</span>
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue"></span>
            <span>{student.visibleId}</span>
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
                onClick={() => {
                  console.log(form.formState.errors);
                }}
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
