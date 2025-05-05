"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Prisma } from "@prisma/client";

type SchoolSelectorProps = {
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
  onSelectSchool: (schoolId: string) => void;
  activeSchoolId?: string;
};

export function SchoolSelector({
  schools,
  onSelectSchool,
  activeSchoolId,
}: SchoolSelectorProps) {
  return (
    <Select onValueChange={onSelectSchool} value={activeSchoolId}>
      <SelectTrigger>
        <SelectValue placeholder="Select a school" />
      </SelectTrigger>
      <SelectContent>
        {schools.map((school) => (
          <SelectItem key={school.id} value={school.id}>
            {school.schoolName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type StudentSelectorProps = {
  students: Prisma.StudentGetPayload<{}>[];
  onSelectStudent: (studentId: string) => void;
  activeStudentId?: string;
};

export function StudentSelector({
  students,
  onSelectStudent,
  activeStudentId,
}: StudentSelectorProps) {
  return (
    <Select onValueChange={onSelectStudent} value={activeStudentId}>
      <SelectTrigger>
        <SelectValue placeholder="Select a student" />
      </SelectTrigger>
      <SelectContent>
        {students.map((student) => (
          <SelectItem key={student.id} value={student.id}>
            {student.studentName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
