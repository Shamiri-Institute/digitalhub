"use client";
import { addNonShamiriStudentViaClinicalScreening } from "#/app/actions";
import { Icons } from "#/components/icons";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { useToast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const NonShamirianStudentSchema = z.object({
  studentName: z
    .string({
      required_error: "Please enter the student name.",
    })
    .trim()
    .min(1, "Student name is too short."),
  admissionNumber: z
    .string({
      required_error: "Please enter the student's admission number.",
    })
    .trim()
    .min(1, "Admission number is not valid."),
  age: z
    .string({
      required_error: "Please enter the student's age.",
    })
    .trim()
    .min(1, "Age is not valid."),

  county: z
    .string({
      required_error: "Please enter the student's county.",
    })
    .trim()
    .min(1, "County name is too short."),

  form: z
    .string({
      required_error: "Please enter the student's form.",
    })
    .trim(),
  contactNumber: z
    .string({
      required_error: "Please enter the student's contact number.",
    })
    .min(9, "Please enter a valid contact number")
    .optional(),
  stream: z
    .string({
      required_error: "Please enter the student's stream.",
    })
    .trim(),

  gender: z
    .string({
      required_error: "Please select the student's gender.",
    })
    .trim()
    .min(1, "Please select the student's gender"),
  schoolVisibleId: z
    .string({
      required_error: "Please select the student's school",
    })
    .trim()
    .min(1, "Please select the student's school"),
});

export default function CreateNonShamiriStudentPage({
  schools,
  implementerId,
  supervisorId,
}: {
  schools: Prisma.SchoolGetPayload<{}>[];
  implementerId: string;
  supervisorId: string;
}) {
  const form = useForm<z.infer<typeof NonShamirianStudentSchema>>({
    resolver: zodResolver(NonShamirianStudentSchema),
    defaultValues: {
      admissionNumber: "",
      age: "",
      contactNumber: "",
      county: "",
      form: "",
      gender: "",
      schoolVisibleId: "",
      stream: "",
      studentName: "",
    },
  });

  const { toast } = useToast();

  async function onSubmit(data: z.infer<typeof NonShamirianStudentSchema>) {
    const result = await addNonShamiriStudentViaClinicalScreening(data, {
      implementerId,
      supervisorId,
    });

    if (result.success) {
      toast({
        variant: "default",
        description: "Successfully added student and created clinical case.",
      });
    } else {
      toast({
        variant: "destructive",
        description: `${result.error ? result.error : "Something went wrong."}`,
      });
    }
  }

  return (
    <div className="flex flex-col ">
      <div className="mb-5  mt-2 flex items-center justify-end">
        <Link href={`/screenings`}>
          <Icons.xIcon className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        </Link>
      </div>

      <h3 className="text-base font-semibold text-brand">
        Student Information
      </h3>
      <div className="space-y-6 ">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.log(errors);
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
                  name="schoolVisibleId"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <FormLabel htmlFor="schoolVisibleId">School</FormLabel>
                      <FormItem>
                        <FormControl>
                          <Select
                            name="schoolVisibleId"
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue
                                className="text-muted-foreground"
                                defaultValue={field.value}
                                onChange={field.onChange}
                                placeholder={
                                  <span className="text-muted-foreground">
                                    Select school
                                  </span>
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {schools.map((school, index) => (
                                <SelectItem key={index} value={school.id}>
                                  {school.schoolName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </div>
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
            </div>

            <Button className="mt-4 w-full bg-shamiri-blue hover:bg-shamiri-blue">
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
