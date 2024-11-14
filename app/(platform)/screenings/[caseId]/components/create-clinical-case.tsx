"use client";

import { Combobox } from "#/components/ui/combobox";
import { Prisma, Student } from "@prisma/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createClinicalCase } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";

import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";

type CustomError = {
  schoolMessage?: string;
  studentMessage?: string;
};
export default function CreateClinicalCaseDialogue({
  children,
  currentSupervisorId,
  schools = [],
}: {
  children: React.ReactNode;
  currentSupervisorId: string | undefined;
  schools: Prisma.SchoolGetPayload<{
    include: {
      students: true;
      interventionGroups: {
        include: {
          students: true;
        };
      };
      assignedSupervisor: {
        include: {
          fellows: {
            include: {
              students: true;
            };
          };
        };
      };
    };
  }>[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>();

  const [selectedSudentId, setSelectedStudentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInterventionGroup, setSelectedInterventionGroup] = useState<
    Prisma.InterventionGroupGetPayload<{
      include: {
        students: true;
      };
    }>[]
  >();

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<CustomError>();

  const { toast } = useToast();

  async function onSubmit() {
    if (!currentSupervisorId) {
      toast({
        variant: "destructive",
        title: "Error creating case. No supervisor found.",
      });
      return;
    }
    if (!selectedSchoolId) {
      setErrorMessage({ schoolMessage: `No school selected.` });
      return;
    }
    if (!selectedSudentId) {
      setErrorMessage({ studentMessage: `No student selected.` });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await createClinicalCase({
        schoolId: selectedSchoolId,
        currentSupervisorId: currentSupervisorId,
        studentId: selectedSudentId,
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

      setSelectedSchoolId("");
      setSelectedStudentId("");
      setSelectedGroupId("");
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error creating case. Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    // from the selected school id, get the intervention groups then also get the students from that school
    const selectedSchool = schools?.find(
      (school) => school.id === selectedSchoolId,
    );

    if (selectedSchool?.students) {
      setStudents(() => selectedSchool?.students);
    }
    setSelectedInterventionGroup(selectedSchool?.interventionGroups);

    setErrorMessage(undefined);
  }, [selectedSchoolId, schools, students]);

  useEffect(() => {
    // from the selected group id, get the students
    const students =
      selectedInterventionGroup?.find((group) => group.id === selectedGroupId)
        ?.students ?? [];

    setStudents(students);
  }, [selectedGroupId, selectedInterventionGroup]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="space-y-0 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">Create Clinical Case</span>
          </div>
        </DialogHeader>
        <Separator />
        <div className="my-6 space-y-6">
          <div className="px-4">
            <SchoolSelector
              schools={schools}
              activeSchoolId={selectedSchoolId}
              onSelectSchool={setSelectedSchoolId}
            />
            {errorMessage && (
              <div className="ml-1 mt-1 text-sm text-red-500">
                {errorMessage.schoolMessage}
              </div>
            )}
          </div>

          <div className="px-4">
            <GroupSelector
              interventionGroups={selectedInterventionGroup ?? []}
              activeGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
            />
          </div>

          <div className="px-4">
            <StudentSelector
              students={students ?? []}
              activeStudentId={selectedSudentId}
              onSelectStudent={setSelectedStudentId}
            />
            {errorMessage && (
              <div className="ml-1 mt-1 text-sm text-red-500">
                {errorMessage.studentMessage}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end px-6 pb-3">
          <Button
            variant="brand"
            className="w-full"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Create Case
          </Button>
        </div>
        <Separator className="mb-3" />

        <div className="flex justify-end px-6 pb-6">
          <Link href={"/screenings/create-student"} className="flex flex-1">
            <Button variant="brand" className="w-full">
              Clinical Intake Form
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SchoolSelectorProps = {
  schools: Prisma.SchoolGetPayload<{}>[];
  activeSchoolId: string;
  onSelectSchool: (schoolId: string) => void;
};

export function SchoolSelector({
  schools,
  activeSchoolId,
  onSelectSchool,
}: SchoolSelectorProps) {
  return (
    <Combobox
      items={schools.map((school) => ({
        id: school.id,
        label: school.schoolName,
      }))}
      activeItemId={activeSchoolId}
      onSelectItem={onSelectSchool}
      placeholder="Select school..."
    />
  );
}

type GroupSelectorProps = {
  interventionGroups: Prisma.InterventionGroupGetPayload<{}>[];
  activeGroupId: string;
  onSelectGroup: (schoolId: string) => void;
};

export function GroupSelector({
  interventionGroups,
  activeGroupId,
  onSelectGroup,
}: GroupSelectorProps) {
  return (
    <Combobox
      items={interventionGroups.map((group) => ({
        id: group.id,
        label: group.groupName,
      }))}
      activeItemId={activeGroupId}
      onSelectItem={onSelectGroup}
      placeholder="Select intervention group... (optional)"
    />
  );
}

type StudentSelectorProps = {
  students: Student[];
  activeStudentId: string;
  onSelectStudent: (schoolId: string) => void;
};

export function StudentSelector({
  students,
  activeStudentId,
  onSelectStudent,
}: StudentSelectorProps) {
  return (
    <Combobox
      items={students.map((student) => ({
        id: student.id,
        label: `${student?.studentName ?? "N/A"} - ${student?.admissionNumber ?? "N/A"} - ${student?.form ?? ""}${student?.stream ?? "N/A"}`,
      }))}
      activeItemId={activeStudentId}
      onSelectItem={onSelectStudent}
      placeholder="Select student..."
    />
  );
}
