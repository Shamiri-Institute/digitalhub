import InfoCard from "#/app/(platform)/hc/students/components/info-card";
import { Prisma } from "@prisma/client";

export default function StudentsStats({
  totalNumberOfStudentsInHub,
  totalGroupSessions,
  hubClinicalCases,
  hubClinicalSessions,
}: {
  totalNumberOfStudentsInHub: number;
  totalGroupSessions: number;
  hubClinicalCases: Prisma.ClinicalScreeningInfoGetPayload<{}>[];
  hubClinicalSessions: Prisma.ClinicalSessionAttendanceGetPayload<{}>[];
}) {
  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <InfoCard
        title="Total no. of students"
        content={totalNumberOfStudentsInHub}
      />
      <InfoCard title="Count of group sessions" content={totalGroupSessions} />
      <InfoCard
        title="No. of clinical cases"
        content={hubClinicalCases?.length ?? 0}
      />
      <InfoCard
        title="No. of clinical sessions"
        content={hubClinicalSessions?.length ?? 0}
      />
    </div>
  );
}
