import { orderedSeriesColor, seriesColor } from "#/components/charts/constants";
import { RingBreakdown } from "#/components/charts/static-charts";
import ChartCard from "#/components/ui/chart-card";

function recordedBasis(recorded: number, totalStudents: number, field: string) {
  return recorded < totalStudents
    ? `${recorded} of ${totalStudents} students have their ${field} recorded.`
    : undefined;
}

function sumOf(groups: { value: number }[]) {
  return groups.reduce((sum, { value }) => sum + value, 0);
}

export default function HubStudentDemographicsCharts({
  totalStudents,
  studentsGroupedByAge,
  studentsGroupedByGender,
  studentsGroupedByForm,
}: {
  totalStudents: number;
  studentsGroupedByAge: Record<string, number>;
  studentsGroupedByGender: Record<string, number>;
  studentsGroupedByForm: Record<string, number>;
}) {
  const studentsByAge = Object.entries(studentsGroupedByAge).map(([age, value], index, ages) => ({
    name: `${age} years`,
    value,
    color: orderedSeriesColor(index, ages.length),
  }));

  const studentsByGender = Object.entries(studentsGroupedByGender)
    .toSorted(([genderA], [genderB]) => genderA.localeCompare(genderB))
    .map(([gender, value], index) => ({ name: gender, value, color: seriesColor(index) }));

  const studentsByForm = Object.entries(studentsGroupedByForm).map(
    ([form, value], index, forms) => ({
      name: `Form ${form}`,
      value,
      color: orderedSeriesColor(index, forms.length),
    }),
  );

  const studentsWithForm = sumOf(studentsByForm);
  const studentsWithAge = sumOf(studentsByAge);
  const studentsWithGender = sumOf(studentsByGender);

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-3">
      <ChartCard
        title="Students grouped by form"
        description={recordedBasis(studentsWithForm, totalStudents, "form")}
      >
        {studentsWithForm > 0 ? <RingBreakdown label="Students" slices={studentsByForm} /> : null}
      </ChartCard>
      <ChartCard
        title="Students grouped by age"
        description={recordedBasis(studentsWithAge, totalStudents, "age")}
      >
        {studentsWithAge > 0 ? <RingBreakdown label="Students" slices={studentsByAge} /> : null}
      </ChartCard>
      <ChartCard
        title="Students grouped by gender"
        description={recordedBasis(studentsWithGender, totalStudents, "gender")}
      >
        {studentsWithGender > 0 ? (
          <RingBreakdown label="Students" slices={studentsByGender} />
        ) : null}
      </ChartCard>
    </div>
  );
}
