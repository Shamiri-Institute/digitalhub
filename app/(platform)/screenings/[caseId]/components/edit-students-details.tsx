"use client";
import { editStudentInfoFromClinicalCaseScreen } from "#/app/actions";
import { Button } from "#/components/ui/button";
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
import { useToast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { addBreadcrumb } from "@sentry/nextjs";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const NonShamirianStudentSchema = z.object({
  studentName: stringValidation("Please enter the student name."),
  admissionNumber: stringValidation(
    "Please enter the student's admission number.",
  ),
  age: stringValidation("Please enter the student's age."),
  county: stringValidation("Please enter the student's county."),
  studentGroup: z
    .string({ required_error: "Please enter the student's group." })
    .trim()
    .optional(),
  form: stringValidation("Please enter the student's form."),
  contactNumber: stringValidation(
    "Please enter the student's contact number.",
  ).optional(),
  stream: z
    .string({
      required_error: "Please enter the student's stream.",
    })
    .trim(),

  gender: stringValidation("Please select the student's gender."),
});

export default function EditStudentDetails({
  student,
  caseId,
  setOpen,
}: {
  student: Prisma.StudentGetPayload<{}>;
  caseId: string;
  setOpen: (value: boolean) => void;
}) {
  const form = useForm<z.infer<typeof NonShamirianStudentSchema>>({
    resolver: zodResolver(NonShamirianStudentSchema),
    defaultValues: {
      studentName: student.studentName || "",
      admissionNumber: student.admissionNumber || "",
      age: student?.age?.toString() || undefined,
      county: student.county || "",
      studentGroup: student.groupName || "",
      form: student.form?.toString() || "",
      contactNumber: student.phoneNumber || "",
      stream: student.stream || "",
      gender: student.gender || "",
    },
  });

  const { toast } = useToast();

  async function onSubmit(data: z.infer<typeof NonShamirianStudentSchema>) {
    const result = await editStudentInfoFromClinicalCaseScreen(
      {
        screeningId: caseId,
        studentId: student.id,
      },
      data,
    );

    if (result?.success) {
      toast({
        variant: "default",
        description: "Successfully edited student's information.",
      });
      form.reset();
      setOpen(false);
    } else {
      toast({
        variant: "destructive",
        description: `${result.error ? result.error : "Something went wrong."}`,
      });
    }
  }

  return (
    <div className="flex flex-col ">
      <h3 className="text-base font-semibold text-brand">
        Edit Student Information
      </h3>
      <div className="space-y-6 ">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              addBreadcrumb({
                message: "Failed to submit form",
                data: { errors },
              });
            })}
          >
            <div className="mt-6 space-y-6 px-[0.9px]">
              <div>
                <FormField
                  control={form.control}
                  name="studentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Name</FormLabel>
                      <FormControl>
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="studentName"
                            name="studentName"
                            onChange={field.onChange}
                            type="text"
                            defaultValue={field.value}
                            placeholder="Student name eg. Jomo Kenyatta"
                            className="resize-none bg-card"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="admissionNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admission Number</FormLabel>

                      <FormControl>
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="admissionNumber"
                            name="admissionNumber"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={field.value}
                            placeholder="Admission number"
                            className="resize-none bg-card"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="age"
                            name="age"
                            type="number"
                            onChange={field.onChange}
                            defaultValue={field.value}
                            placeholder="Age: eg 12"
                            className="resize-none bg-card"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="px-6">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Male" />
                            </FormControl>
                            <FormLabel className="active:scale-95">
                              Male
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Female" />
                            </FormControl>
                            <FormLabel className="active:scale-95">
                              Female
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Other" />
                            </FormControl>
                            <FormLabel className="active:scale-95">
                              Other
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <div className="px-6">
                  <FormField
                    control={form.control}
                    name="form"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class/Form</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="1" />
                              </FormControl>
                              <FormLabel className="active:scale-95">
                                Form 1
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="2" />
                              </FormControl>
                              <FormLabel className="active:scale-95">
                                Form 2
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="3" />
                              </FormControl>
                              <FormLabel className="active:scale-95">
                                Form 3
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="4" />
                              </FormControl>
                              <FormLabel className="active:scale-95">
                                Form 4
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="stream"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stream</FormLabel>
                      <FormControl>
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="stream"
                            name="stream"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={field.value}
                            placeholder="Add stream eg. West, East, North, South"
                            className="resize-none bg-card"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="studentGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student&apos;s Group</FormLabel>

                      <FormControl>
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="studentGroup"
                            name="studentGroup"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={field.value}
                            placeholder="Student group eg. 11_A22"
                            className="resize-none bg-card"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="county"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>County</FormLabel>

                      <FormControl>
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="county"
                            name="county"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={field.value}
                            placeholder="County: eg Nairobi"
                            className="resize-none bg-card"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="contactNumber"
                            name="contactNumber"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={field.value}
                            placeholder="Contact number eg. 0712345678"
                            className="resize-none bg-card"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button
              className="mt-4 w-full bg-shamiri-blue hover:bg-shamiri-blue"
              disabled={!form.formState.isDirty}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
