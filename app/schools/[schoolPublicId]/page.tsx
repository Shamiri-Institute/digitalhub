import { PieChart, Pie, Cell } from "recharts";

import { Icons } from "#/components/icons";

const selectedSchool = {
  demographics: [
    {
      name: "Male",
      value: 10,
    },
    {
      name: "Female",
      value: 40,
    },
  ],
};

export default function SchoolPage({
  params,
}: {
  params: { schoolPublicId: string };
}) {
  return (
    <main className="pt-8">
      <Header />
    </main>
  );
}

function Header() {
  return (
    <header className="flex justify-between">
      <div>
        <Icons.chevronLeft className="h-6 w-6 text-brand mr-4 align-baseline" />
      </div>
      <div className="flex gap-2">
        <Icons.edit className="h-6 w-6 text-brand mr-4 align-baseline" />
        <Icons.search className="h-6 w-6 text-brand" strokeWidth={1.75} />
      </div>
    </header>
  );
}

function DemographicsChart() {
  return (
    <PieChart width={100} height={100}>
      <Pie
        data={data}
        cx={50}
        cy={50}
        innerRadius={30}
        outerRadius={45}
        fill="#8884d8"
        paddingAngle={3}
        dataKey="value"
        stroke="none"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
      </Pie>
    </PieChart>
  );
}
