"use client";

import { createClinicalCaseBySupervisor } from "#/app/(platform)/sc/clinical/action";
import {
  SchoolSelector,
  StudentSelector,
} from "#/app/(platform)/screenings/[caseId]/components/create-clinical-case";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "#/components/ui/dialog";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  school: z.string().min(1, "School is required"),
  studentName: z.string().min(1, "Student name is required"),
  pseudonym: z.string().min(1, "Pseudonym is required"),
  admissionNumber: z.number().min(1, "Admission number is required"),
  yearOfBirth: z.string().min(1, "Year of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  classForm: z.string().min(1, "Class/Form is required"),
  stream: z.string().optional(),
  initialContact: z.enum(["student", "fellow", "supervisor", "teacher"]),
  supervisor: z.string().optional(),
  fellow: z.string().optional(),
  session: z.string().min(1, "Session is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddNewClinicalCaseForm({
  children,
  schools = [],
  fellowsInHub = [],
  supervisorsInHub = [],
  currentSupervisorId,
}: {
  children?: React.ReactNode;
  schools: Prisma.SchoolGetPayload<{
    include: {
      students: true;
      interventionSessions: {
        select: {
          id: true;
          session: {
            select: {
              sessionName: true;
              sessionLabel: true;
            };
          };
        };
      };
    };
  }>[];
  fellowsInHub: Prisma.FellowGetPayload<{}>[];
  supervisorsInHub: Prisma.SupervisorGetPayload<{}>[];
  currentSupervisorId: string;
}) {
  const [open, setOpen] = useState(false);
  const [initialContactType, setInitialContactType] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [students, setStudents] = useState<Prisma.StudentGetPayload<{}>[]>([]);
  const [availableSessions, setAvailableSessions] = useState<
    Array<{ id: string; sessionLabel: string }>
  >([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      school: "",
      studentName: "",
      pseudonym: "",
      stream: "",
    },
  });

  const handleSchoolSelect = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    form.setValue("school", schoolId);

    const selectedSchool = schools?.find((school) => school.id === schoolId);
    if (selectedSchool?.students) {
      setStudents(selectedSchool.students);
    }

    if (selectedSchool?.interventionSessions) {
      setAvailableSessions(
        selectedSchool.interventionSessions.map(({ id, session }) => ({
          id,
          sessionLabel: session?.sessionLabel || "",
        })),
      );
    }
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    form.setValue("studentName", studentId);

    const selectedStudent = students.find(
      (student) => student.id === studentId,
    );
    if (selectedStudent) {
      form.setValue("studentName", selectedStudent.studentName || "");
      form.setValue("admissionNumber", Number(selectedStudent.admissionNumber));
      form.setValue(
        "yearOfBirth",
        selectedStudent.yearOfBirth?.toString() || "",
      );
      form.setValue(
        "gender",
        (selectedStudent.gender?.toLowerCase() as any) || "",
      );
      form.setValue("classForm", selectedStudent.form?.toString() || "");
      form.setValue("stream", selectedStudent.stream || "");
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!selectedSchoolId || !selectedStudentId) {
      toast({
        title: "Missing required fields",
        description: "Please select both a school and a student",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await createClinicalCaseBySupervisor({
        schoolId: selectedSchoolId,
        currentSupervisorId,
        studentId: selectedStudentId,
        pseudonym: data.pseudonym,
        stream: data.stream || "",
        classForm: data.classForm,
        age: new Date().getFullYear() - parseInt(data.yearOfBirth),
        gender: data.gender,
        initialContact: data.initialContact,
        supervisorId: data.supervisor,
        fellowId: data.fellow,
        sessionId: data.session,
      });

      if (response.success) {
        toast({
          title: "Clinical case created successfully",
        });
        form.reset();
        setSelectedSchoolId("");
        setSelectedStudentId("");
        setAvailableSessions([]);
        setInitialContactType("");
        setOpen(false);
      } else {
        toast({
          title: "Error creating clinical case",
          description: response.message || "Failed to create clinical case",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating clinical case:", error);
      toast({
        title: "Error creating clinical case",
        description: "Something went wrong while creating the case",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children}
      <DialogContent className="w-2/5 max-w-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <span className="text-xl">Add clinical case</span>
            </DialogHeader>

            <div className="space-y-2">
              <FormLabel>
                School
                <span className="text-red-500">*</span>
              </FormLabel>
              <SchoolSelector
                schools={schools}
                activeSchoolId={selectedSchoolId}
                onSelectSchool={handleSchoolSelect}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>
                Student
                <span className="text-red-500">*</span>
              </FormLabel>
              <StudentSelector
                students={students}
                activeStudentId={selectedStudentId}
                onSelectStudent={handleStudentSelect}
              />
            </div>

            <FormField
              control={form.control}
              name="pseudonym"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Pseudonym
                    <span className="text-red-500">*</span>
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
              name="admissionNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    School Admission Number
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-row gap-4">
              <FormField
                control={form.control}
                name="yearOfBirth"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      Year of Birth
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      Gender
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-row gap-4">
              <FormField
                control={form.control}
                name="classForm"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      Class/Form
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Form 1</SelectItem>
                        <SelectItem value="2">Form 2</SelectItem>
                        <SelectItem value="3">Form 3</SelectItem>
                        <SelectItem value="4">Form 4</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stream"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      Stream
                      <span className="text-red-500">*</span>
                    </FormLabel>
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
              name="initialContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Initial Contact
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setInitialContactType(value);
                    }}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select initial contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="fellow">Fellow</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex w-full flex-1 flex-row gap-4">
              {initialContactType === "supervisor" && (
                <FormField
                  control={form.control}
                  name="supervisor"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Select Supervisor
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisorsInHub.map((supervisor) => (
                            <SelectItem
                              key={supervisor.id}
                              value={supervisor.id}
                            >
                              {supervisor.supervisorName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {initialContactType === "fellow" && (
                <FormField
                  control={form.control}
                  name="fellow"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Select Fellow
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fellow" />
                        </SelectTrigger>
                        <SelectContent>
                          {fellowsInHub.map((fellow) => (
                            <SelectItem key={fellow.id} value={fellow.id}>
                              {fellow.fellowName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="session"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Select Session
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.sessionLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-row justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Dismiss
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
