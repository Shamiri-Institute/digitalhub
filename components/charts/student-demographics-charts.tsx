"use client";

import { Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SERIES_COLORS, orderedSeriesColor } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";

const pieLegend = (
  <Legend
    layout="horizontal"
    verticalAlign="bottom"
    align="center"
    iconType="circle"
    iconSize={8}
  />
);

function recordedBasis(recorded: number, totalStudents: number, field: string) {
  return recorded < totalStudents
    ? `${recorded} of ${totalStudents} students have their ${field} recorded.`
    : undefined;
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
  const formatedStudentsGroupedByAge = Object.entries(studentsGroupedByAge).map(
    ([age, value], index, ages) => ({ age, value, fill: orderedSeriesColor(index, ages.length) }),
  );

  const formatedStudentsGroupedByGender = Object.entries(studentsGroupedByGender)
    .toSorted(([genderA], [genderB]) => genderA.localeCompare(genderB))
    .map(([gender, value], index) => ({ gender, value, fill: SERIES_COLORS[index] }));

  const formatedStudentsGroupedByForm = Object.entries(studentsGroupedByForm).map(
    ([form, value], index, forms) => ({
      form: `Form ${form}`,
      value,
      fill: orderedSeriesColor(index, forms.length),
    }),
  );

  const sumOf = (groups: { value: number }[]) => groups.reduce((acc, val) => acc + val.value, 0);
  const studentsWithForm = sumOf(formatedStudentsGroupedByForm);
  const studentsWithAge = sumOf(formatedStudentsGroupedByAge);
  const studentsWithGender = sumOf(formatedStudentsGroupedByGender);

  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-3">
      <ChartCard
        title="Students grouped by form"
        description={recordedBasis(studentsWithForm, totalStudents, "form")}
        showCardFooter={false}
      >
        {formatedStudentsGroupedByForm.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Students grouped by form">
              <Pie
                data={formatedStudentsGroupedByForm}
                dataKey="value"
                nameKey="form"
                startAngle={90}
                endAngle={450}
                outerRadius={75}
                innerRadius={50}
              >
                <Label
                  position="center"
                  className="fill-shamiri-black text-xl font-semibold leading-8"
                >
                  {studentsWithForm}
                </Label>
              </Pie>
              <Tooltip formatter={(value) => `${value} students`} />
              {pieLegend}
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard
        title="Students grouped by age"
        description={recordedBasis(studentsWithAge, totalStudents, "age")}
        showCardFooter={false}
      >
        {formatedStudentsGroupedByAge.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Students grouped by age">
              <Pie
                data={formatedStudentsGroupedByAge}
                dataKey="value"
                nameKey="age"
                startAngle={90}
                endAngle={450}
                outerRadius={100}
                innerRadius={70}
              />
              <Tooltip
                formatter={(value) => `${value} students`}
                labelFormatter={(label) => `${label} years`}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard
        title="Students grouped by gender"
        description={recordedBasis(studentsWithGender, totalStudents, "gender")}
        showCardFooter={false}
      >
        {formatedStudentsGroupedByGender.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307} aria-label="Students grouped by gender">
              <Pie
                data={formatedStudentsGroupedByGender}
                dataKey="value"
                nameKey="gender"
                startAngle={90}
                endAngle={450}
                outerRadius={75}
                innerRadius={50}
              >
                <Label
                  position="center"
                  className="fill-shamiri-black text-xl font-semibold leading-8"
                >
                  {studentsWithGender}
                </Label>
              </Pie>
              <Tooltip formatter={(value) => `${value} students`} />
              {pieLegend}
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
