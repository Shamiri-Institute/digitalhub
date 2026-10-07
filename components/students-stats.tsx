import InfoCard from "#/app/(platform)/hc/students/components/info-card";

export default function StudentsStats({
  totalNumberOfStudentsInHub,
  totalGroupSessions,
  clinicalCaseCount,
  clinicalSessionCount,
}: {
  totalNumberOfStudentsInHub: number;
  totalGroupSessions: number;
  clinicalCaseCount: number;
  clinicalSessionCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
      <InfoCard title="Total no. of students" content={totalNumberOfStudentsInHub} />
      <InfoCard title="Count of group sessions" content={totalGroupSessions} />
      <InfoCard title="No. of clinical cases" content={clinicalCaseCount} />
      <InfoCard title="No. of clinical sessions" content={clinicalSessionCount} />
    </div>
  );
}
