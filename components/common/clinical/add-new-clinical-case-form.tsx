"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createStudentClinicalCase } from "#/app/(platform)/sc/clinical/action";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Combobox } from "#/components/ui/combobox";
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
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { toast } from "#/components/ui/use-toast";
import { GENDER_OPTIONS } from "#/lib/constants";
import { cn, stringValidation } from "#/lib/utils";

const formSchema = z.object({
  school: stringValidation("School"),
  studentName: stringValidation("Student name is required"),
  pseudonym: stringValidation("Pseudonym is required"),
  admissionNumber: z.number().min(1, "Admission number is required"),
  yearOfBirth: z.date({ required_error: "Year of birth is required" }),
  gender: z.enum(GENDER_OPTIONS),
  classForm: stringValidation("Class/Form is required"),
  stream: z.string().optional(),
  initialContact: z.enum(["student", "fellow", "supervisor", "teacher"]),
  supervisor: z.string().optional(),
  fellow: z.string().optional(),
  session: stringValidation("Session is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddNewClinicalCaseForm({
  children,
  schools = [],
  fellowsInProject = [],
  supervisorsInHub = [],
  creatorId,
  role,
  hubs = [],
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
  fellowsInProject: Prisma.FellowGetPayload<{}>[];
  supervisorsInHub: Prisma.SupervisorGetPayload<{}>[];
  creatorId: string;
  role: "CLINICAL_LEAD" | "SUPERVISOR";
  hubs: Prisma.HubGetPayload<{
    select: {
      id: true;
      hubName: true;
    };
  }>[];
}) {
  const [open, setOpen] = useState(false);
  const [initialContactType, setInitialContactType] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedHubId, setSelectedHubId] = useState<string>("");
  const [students, setStudents] = useState<Prisma.StudentGetPayload<{}>[]>([]);
  const [availableSessions, setAvailableSessions] = useState<
    Array<{ id: string; sessionLabel: string }>
  >([]);
  const [fellowsInHub, setFellowsInHub] = useState<Prisma.FellowGetPayload<{}>[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      school: "",
      studentName: "",
      pseudonym: "",
      stream: "",
      admissionNumber: undefined,
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

    const selectedStudent = students.find((student) => student.id === studentId);
    if (selectedStudent) {
      form.setValue("studentName", selectedStudent.studentName || "");
      form.setValue("admissionNumber", Number(selectedStudent.admissionNumber));
      if (selectedStudent.yearOfBirth) {
        form.setValue("yearOfBirth", new Date(selectedStudent.yearOfBirth, 0, 1));
      }
      form.setValue("gender", (selectedStudent.gender?.toLowerCase() as any) || "");
      form.setValue("classForm", selectedStudent.form?.toString() || "");
      form.setValue("stream", selectedStudent.stream || "");
    }
  };

  const handleInitialContactChange = (value: string) => {
    setInitialContactType(value);
    if (value !== "fellow") {
      setSelectedHubId("");
      setFellowsInHub([]);
      form.setValue("fellow", "");
    }
    if (value !== "supervisor") {
      form.setValue("supervisor", "");
    }
  };

  const handleHubSelect = (hubId: string) => {
    setSelectedHubId(hubId);
    const fellowsInSelectedHub = fellowsInProject.filter((fellow) => fellow.hubId === hubId);
    setFellowsInHub(fellowsInSelectedHub);
    form.setValue("fellow", "");
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
      const response = await createStudentClinicalCase({
        schoolId: selectedSchoolId,
        creatorId,
        studentId: selectedStudentId,
        pseudonym: data.pseudonym,
        stream: data.stream || "",
        classForm: data.classForm,
        age: new Date().getFullYear() - data.yearOfBirth.getFullYear(),
        gender: data.gender,
        initialContact: data.initialContact,
        supervisorId: data.supervisor,
        fellowId: data.fellow,
        sessionId: data.session,
        role,
      });

      if (response.success) {
        toast({
          title: "Clinical case created successfully",
        });
        form.reset();
        setSelectedSchoolId("");
        setSelectedStudentId("");
        setSelectedHubId("");
        setAvailableSessions([]);
        setInitialContactType("");
        setFellowsInHub([]);
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
              <Combobox
                items={schools.map((school) => ({
                  id: school.id,
                  label: school.schoolName || "Unknown School",
                }))}
                activeItemId={selectedSchoolId}
                onSelectItem={handleSchoolSelect}
                placeholder="Select a school..."
                inputPlaceholder="Search schools..."
              />
            </div>

            <div className="space-y-2">
              <FormLabel>
                Student
                <span className="text-red-500">*</span>
              </FormLabel>
              <Combobox
                items={students.map((student) => ({
                  id: student.id,
                  label: student.studentName || "Unknown Student",
                }))}
                activeItemId={selectedStudentId}
                onSelectItem={handleStudentSelect}
                placeholder="Select a student..."
                inputPlaceholder="Search students..."
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
                      placeholder="Enter admission number"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
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
                      Year of Birth <span className="text-red-500">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "mt-1.5 w-full justify-start px-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          <Icons.calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      handleInitialContactChange(value);
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

            <div className="flex w-full flex-1 flex-col gap-4">
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
                      <div>
                        <Combobox
                          items={supervisorsInHub.map((supervisor) => ({
                            id: supervisor.id,
                            label: supervisor.supervisorName || "Unknown Supervisor",
                          }))}
                          activeItemId={field.value || ""}
                          onSelectItem={field.onChange}
                          placeholder="Select a supervisor..."
                          inputPlaceholder="Search supervisors..."
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {initialContactType === "fellow" && (
                <>
                  <div className="w-full">
                    <FormLabel>
                      Select Hub
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <div>
                      <Combobox
                        items={hubs.map((hub) => ({
                          id: hub.id,
                          label: hub.hubName || "Unknown Hub",
                        }))}
                        activeItemId={selectedHubId}
                        onSelectItem={handleHubSelect}
                        placeholder="Select a hub..."
                        inputPlaceholder="Search hubs..."
                      />
                    </div>
                  </div>

                  {selectedHubId && (
                    <FormField
                      control={form.control}
                      name="fellow"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>
                            Select Fellow
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <div>
                            <Combobox
                              items={fellowsInHub.map((fellow) => ({
                                id: fellow.id,
                                label: fellow.fellowName || "Unknown Fellow",
                              }))}
                              activeItemId={field.value || ""}
                              onSelectItem={field.onChange}
                              placeholder="Select a fellow..."
                              inputPlaceholder="Search fellows..."
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Dismiss
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
              >
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
