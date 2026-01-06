"use client";

import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { generateRandomColor, studentsGroupByColors } from "#/components/charts/constants";
import ChartCard from "#/components/ui/chart-card";

export default function HubStudentDemographicsCharts({
  studentsGroupedByAge,
  studentsGroupedByGender,
  studentsGroupedByForm,
}: {
  studentsGroupedByAge: Record<string, number>;
  studentsGroupedByGender: Record<string, number>;
  studentsGroupedByForm: Record<string, number>;
}) {
  const formatedStudentsGroupedByAge = Object.entries(studentsGroupedByAge).map(([age, value]) => ({
    age,
    value,
  }));

  const formatedStudentsGroupedByGender = Object.entries(studentsGroupedByGender).map(
    ([gender, value]) => ({
      gender,
      value,
    }),
  );

  const formatedStudentsGroupedByForm = Object.entries(studentsGroupedByForm).map(
    ([form, value]) => ({
      form,
      value,
    }),
  );

  const randomColors = formatedStudentsGroupedByAge.map(() => generateRandomColor());

  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-3">
      <ChartCard title="Students grouped by form" showCardFooter={false}>
        {formatedStudentsGroupedByForm.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={formatedStudentsGroupedByForm}
                dataKey="value"
                nameKey="form"
                startAngle={90}
                endAngle={450}
                outerRadius={75}
                innerRadius={50}
                fill="#8884d8"
              >
                <Label
                  position="center"
                  className="text-xl font-semibold leading-8 text-shamiri-black"
                >
                  {formatedStudentsGroupedByForm.reduce((acc, val) => acc + val.value, 0)}
                </Label>
                {formatedStudentsGroupedByForm.map((val, index) => (
                  <Cell
                    key={val.form}
                    fill={studentsGroupByColors[index % studentsGroupByColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} students`} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
      <ChartCard title="Students grouped by age" showCardFooter={false}>
        {formatedStudentsGroupedByAge.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={formatedStudentsGroupedByAge}
                dataKey="value"
                nameKey="age"
                startAngle={90}
                endAngle={450}
                outerRadius={75}
                innerRadius={50}
                fill="#8884d8"
              >
                {formatedStudentsGroupedByAge.map((val, index) => (
                  <Cell key={val.age} fill={randomColors[index]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${value} students`}
                labelFormatter={(label) => `${label} years`}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                formatter={(value) => `${value} yrs`}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>

      <ChartCard title="Students grouped by gender" showCardFooter={false}>
        {formatedStudentsGroupedByGender.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart width={307} height={307}>
              <Pie
                data={formatedStudentsGroupedByGender}
                dataKey="value"
                nameKey="gender"
                startAngle={90}
                endAngle={450}
                outerRadius={75}
                innerRadius={50}
                fill="#8884d8"
              >
                <Label
                  position="center"
                  className="text-xl font-semibold leading-8 text-shamiri-black"
                >
                  {formatedStudentsGroupedByGender.reduce((acc, val) => acc + val.value, 0)}
                </Label>
                {formatedStudentsGroupedByGender.map((val, index) => (
                  <Cell
                    key={val.gender}
                    fill={studentsGroupByColors[index % studentsGroupByColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} students`} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartCard>
    </div>
  );
}
