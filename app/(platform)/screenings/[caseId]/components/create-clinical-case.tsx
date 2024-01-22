"use client";

import { createClinicalCase } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Form, FormField, FormItem, FormMessage, FormControl } from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Fellow, School, Student, Supervisor } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";


const FormSchema = z.object({
  school: z.string({
    required_error: "Please select the school.",
  }),
  supervisor: z.string({
    required_error: "Please select the supervisor.",
  }),
  fellow: z.string({
    required_error: "Please select the fellow.",
  }),
  student: z.string({
    required_error: "Please select the student.",
  }),
});

type FellowWithStudents = Fellow & {
  students: Student[];
};

type SupervisorWithFellows = Supervisor & {
  fellows: FellowWithStudents[];
};

type SchoolsWithSupervisors = School & {
  supervisors: SupervisorWithFellows[];
};

export default function CreateClinicalCaseDialogue({
  children,
  currentSupervisorId,
  schools = [],
}: {
  children: React.ReactNode;
  currentSupervisorId: string | undefined;
  schools: SchoolsWithSupervisors[];
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      school: "",
      fellow: "",
      supervisor: "",
      student: "",
    },
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedSupId, setSelectedSupId] = useState<string>("");
  const [selectedFellowId, setSelectedFellowId] = useState<string>("");
  const [supervisors, setSupervisors] = useState<SupervisorWithFellows[]>();
  const [fellows, setFellows] = useState<FellowWithStudents[]>();
  const [students, setStudents] = useState<Student[]>();
  const { toast } = useToast();

  async function onSubmit(data: z.infer<typeof FormSchema>) {

    if (!data.school || !data.supervisor || !data.fellow || !data.student) {
      toast({
        variant: "destructive",
        title: "Please select all fields",
      });
      return;
    }

    if (!currentSupervisorId) {
      toast({
        variant: "destructive",
        title: "Error creating case. No supervisor found.",
      });
      return;
    }
    // todo: update this to show error based on the error message from the server
    try {
      const response = await createClinicalCase({
        schoolId: data.school,
        currentSupervisorId: currentSupervisorId ?? "",
        studentId: data.student,
      });

      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Error creating case. Please try again",
        });
        return;
      }

      toast({
        variant: "default",
        title: "Case created successfully",
      });
      form.reset();
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error creating case. Please try again",
      });
    }
  }

  useEffect(() => {
    // from the selected fellow id, get the fellow
    const students = fellows?.find((fellow) => fellow.id === selectedFellowId)
      ?.students;
    setStudents(students);
  }, [selectedFellowId, fellows]);

  useEffect(() => {
    // from the selected supervisor id, get the fellow
    const fellow = supervisors?.find((sup) => sup.id === selectedSupId)
      ?.fellows;
    console.log({ fellow });
    setFellows(fellow);
  }, [selectedSupId, supervisors]);

  useEffect(() => {
    // from the selected school id, get the supervisors
    const supervisors = schools.find((school) => school.id === selectedSchoolId)
      ?.supervisors;
    setSupervisors(supervisors);
  }, [selectedSchoolId, schools]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <Form {...form}>
          <form
            id="addClincalCase"
            onSubmit={form.handleSubmit(onSubmit)}
            className="overflow-hidden text-ellipsis"
          >
            <DialogHeader className="space-y-0 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium">
                  Create Clinical Case
                </span>
              </div>
            </DialogHeader>
            <Separator />
            <div className="my-6 space-y-6">
              <div className="px-4">
                <FormField
                  control={form.control}
                  name="school"

                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="mt-3 grid w-full gap-1.5">
                          <Select
                            name="school"
                            defaultValue={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedSchoolId(value);
                            }}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue

                                className="text-muted-foreground"
                                defaultValue={field.value}
                                onChange={field.onChange}
                                placeholder={
                                  <span className="text-muted-foreground">
                                    Select School
                                  </span>
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {schools.map((school) => (
                                <SelectItem key={school.id} value={school.id}>
                                  {school.schoolName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="px-4">
                <FormField
                  control={form.control}
                  name="supervisor"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Select
                        name="supervisor"
                        defaultValue={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedSupId(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              //todo: should be group but they are not linked to schools
                              <span className="text-muted-foreground">
                                Select Supervisor
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisors?.map((supervisor) => (
                            <SelectItem
                              key={supervisor.id}
                              value={supervisor.id}
                            >
                              {supervisor.supervisorName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
              <div className="px-4">
                <FormField
                  control={form.control}
                  name="fellow"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Select
                        name="fellow"
                        defaultValue={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedFellowId(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              //todo: should be group but they are not linked to schools
                              <span className="text-muted-foreground">
                                Select Fellow
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {fellows?.map((fellow) => (
                            <SelectItem key={fellow.id} value={fellow.id}>
                              {fellow.fellowName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
              <div className="px-4">
                <FormField
                  control={form.control}
                  name="student"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Select
                        name="student"
                        defaultValue={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select Student
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {students?.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.studentName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end px-6 pb-3">
              <Button
                variant="brand"
                form="addClincalCase"
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Case
              </Button>
            </div>
            <Separator className="mb-3" />
          </form>
        </Form>
        <div className="flex justify-end px-6 pb-6">
          <Link href={"/screenings/create-student"} className="flex flex-1">
            <Button variant="brand" onClick={() => { }} className="w-full">
              Non-Shamiri Student
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
