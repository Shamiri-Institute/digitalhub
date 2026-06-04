"use client";

import type { Fellow, Prisma, Student, Supervisor } from "@prisma/client";
import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createStudentClinicalCase } from "#/app/(platform)/sc/clinical/action";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Combobox } from "#/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { GENDER_OPTIONS } from "#/lib/constants";
import { cn, stringValidation } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";

function isValidStudentAge(date: Date) {
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 35, today.getMonth(), today.getDate());
  const maxDate = new Date(today.getFullYear() - 9, today.getMonth(), today.getDate());
  return date >= minDate && date <= maxDate;
}

const formSchema = z
  .object({
    school: stringValidation("School"),
    isNewStudent: z.boolean(),
    studentName: z.string().optional(),
    pseudonym: stringValidation("Pseudonym is required"),
    admissionNumber: z.number().optional(),
    yearOfBirth: z.date().optional(),
    gender: z.enum(GENDER_OPTIONS).optional(),
    classForm: z.string().optional(),
    stream: z.string().optional(),
    initialContact: z.enum(["student", "fellow", "supervisor", "teacher"]),
    supervisor: z.string().optional(),
    fellow: z.string().optional(),
    session: stringValidation("Session is required"),
  })
  .superRefine((data, ctx) => {
    if (!data.isNewStudent) {
      return;
    }

    if (!data.studentName) {
      ctx.addIssue({ code: "custom", path: ["studentName"], message: "Student name is required" });
    }
    if (!data.admissionNumber || data.admissionNumber < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["admissionNumber"],
        message: "Admission number is required",
      });
    }
    if (!data.yearOfBirth) {
      ctx.addIssue({ code: "custom", path: ["yearOfBirth"], message: "Year of birth is required" });
    } else if (!isValidStudentAge(data.yearOfBirth)) {
      ctx.addIssue({
        code: "custom",
        path: ["yearOfBirth"],
        message: "Student must be between 9 and 35 years old",
      });
    }
    if (!data.gender) {
      ctx.addIssue({ code: "custom", path: ["gender"], message: "Gender is required" });
    }
    if (!data.classForm) {
      ctx.addIssue({ code: "custom", path: ["classForm"], message: "Grade/Form is required" });
    }
    if (!data.stream) {
      ctx.addIssue({ code: "custom", path: ["stream"], message: "Stream is required" });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export function AddNewClinicalCaseForm({
  children,
  schools = [],
  fellowsInProject = [],
  supervisorsInHub = [],
  creatorId,
  userRole,
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
  fellowsInProject: Fellow[];
  supervisorsInHub: Supervisor[];
  creatorId: string;
  userRole: "CLINICAL_LEAD" | "SUPERVISOR";
  hubs: Prisma.HubGetPayload<{
    select: {
      id: true;
      hubName: true;
    };
  }>[];
}) {
  const [open, setOpen] = useState(false);
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [initialContactType, setInitialContactType] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedHubId, setSelectedHubId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [availableSessions, setAvailableSessions] = useState<
    Array<{ id: string; sessionLabel: string }>
  >([]);
  const [fellowsInHub, setFellowsInHub] = useState<Fellow[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      school: "",
      isNewStudent: false,
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
      const genderValue = selectedStudent.gender as (typeof GENDER_OPTIONS)[number] | null;
      if (genderValue) {
        form.setValue("gender", genderValue);
      }
      form.setValue("classForm", selectedStudent.form?.toString() || "");
      form.setValue("stream", selectedStudent.stream || "");
    }
  };

  const toggleNewStudent = () => {
    const nextIsNewStudent = !isNewStudent;
    setIsNewStudent(nextIsNewStudent);
    form.setValue("isNewStudent", nextIsNewStudent);
    setSelectedStudentId("");
    form.setValue("studentName", "");
    form.setValue("admissionNumber", undefined);
    form.setValue("yearOfBirth", undefined);
    form.setValue("gender", undefined);
    form.setValue("classForm", "");
    form.setValue("stream", "");
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
    if (!selectedSchoolId) {
      toast({
        title: "Missing required fields",
        description: "Please select a school",
        variant: "destructive",
      });
      return;
    }

    if (!isNewStudent && !selectedStudentId) {
      toast({
        title: "Missing required fields",
        description: "Please select a student or add a new one",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await createStudentClinicalCase({
        schoolId: selectedSchoolId,
        creatorId,
        studentId: isNewStudent ? undefined : selectedStudentId,
        newStudent:
          isNewStudent && data.yearOfBirth
            ? {
                studentName: data.studentName ?? "",
                admissionNumber: String(data.admissionNumber),
                yearOfBirth: data.yearOfBirth.getFullYear(),
                age: new Date().getFullYear() - data.yearOfBirth.getFullYear(),
                gender: data.gender ?? "",
                classForm: data.classForm ?? "",
                stream: data.stream ?? "",
              }
            : undefined,
        pseudonym: data.pseudonym,
        initialContact: data.initialContact,
        supervisorId: data.supervisor,
        fellowId: data.fellow,
        sessionId: data.session,
        role: userRole,
      });

      if (response.success) {
        toast({
          title: "Clinical case created successfully",
        });
        form.reset();
        setIsNewStudent(false);
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
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="text-xl">Add clinical case</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    Student Information
                  </span>
                  <Separator />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <FormLabel>
                      School
                      <span className="text-shamiri-light-red">*</span>
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
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        Student
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm text-shamiri-new-blue"
                        onClick={toggleNewStudent}
                      >
                        {isNewStudent ? "Select existing student" : "Add new student"}
                      </Button>
                    </div>
                    {isNewStudent ? (
                      <FormField
                        control={form.control}
                        name="studentName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Enter student name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
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
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="pseudonym"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Pseudonym
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isNewStudent && (
                    <>
                      <FormField
                        control={form.control}
                        name="admissionNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              School Admission Number
                              <span className="text-shamiri-light-red">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Enter admission number"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value ? Number(e.target.value) : undefined,
                                  )
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
                                Year of Birth <span className="text-shamiri-light-red">*</span>
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
                                    captionLayout="dropdown"
                                    fromYear={new Date().getFullYear() - 35}
                                    toYear={new Date().getFullYear() - 9}
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
                                <span className="text-shamiri-light-red">*</span>
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
                                Grade/Form
                                <span className="text-shamiri-light-red">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input {...field} type="number" placeholder="Enter grade/form" />
                              </FormControl>
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
                                <span className="text-shamiri-light-red">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    Case Details
                  </span>
                  <Separator />
                </div>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="initialContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Initial Contact
                          <span className="text-shamiri-light-red">*</span>
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
                              <span className="text-shamiri-light-red">*</span>
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
                            <span className="text-shamiri-light-red">*</span>
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
                                  <span className="text-shamiri-light-red">*</span>
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
                          <span className="text-shamiri-light-red">*</span>
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
                </div>
              </div>
            </div>

            <Separator className="my-6" />
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="brand"
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
