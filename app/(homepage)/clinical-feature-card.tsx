"use client";

import { PieChart, Pie, Sector, Cell } from "recharts";

import { Card } from "#/components/ui/card";
import { Icons } from "#/components/icons";
import { useIsServerSide } from "#/lib/hooks/use-is-server-side";
import { cn } from "#/lib/utils";

const data = [
  {
    name: "Active",
    value: 10,
  },
  {
    name: "Follow-up",
    value: 40,
  },
  {
    name: "Referred",
    value: 5,
  },
  {
    name: "Terminated",
    value: 8,
  },
];
const colors = ["#7EA16B", "#FABC2A", "#D295BF", "#B0D5EA"];

export function ClinicalFeatureCard() {
  return (
    <Card className="px-6 py-5 flex flex-col gap-5 bg-active-card">
      <div>
        <div className="flex align-middle gap-4 text-base text-active-card-foreground">
          <Icons.heartHandshake className="align-baseline h-4 w-4 xl:h-7 xl:w-7" />
          <div className="xl:text-2xl font-medium">Clinical cases</div>
        </div>
      </div>
      <div className="flex justify-between gap-6">
        <div className="h-[100px] w-[100px] rounded-full shrink-0">
          <ClinicalCasesDonutChart />
        </div>
        <div className="w-full space-y-1">
          <LegendItem
            colorClass="bg-muted-green"
            label="Active"
            count={data.find((d) => d.name === "Active")?.value!}
          />
          <LegendItem
            colorClass="bg-muted-yellow"
            label="Follow-up"
            count={data.find((d) => d.name === "Follow-up")?.value!}
          />
          <LegendItem
            colorClass="bg-muted-pink"
            label="Referred"
            count={data.find((d) => d.name === "Active")?.value!}
          />
          <LegendItem
            colorClass="bg-muted-sky"
            label="Terminated"
            count={data.find((d) => d.name === "Active")?.value!}
          />
        </div>
      </div>
    </Card>
  );
}

function LegendItem({
  colorClass,
  label,
  count,
}: {
  colorClass: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex justify-between pb-1 border-b border-border/40 last:border-none">
      <p className="text-white text-sm font-semibold">{label}</p>
      <div className={cn("px-3 rounded-sm", colorClass)}>
        <p className="text-white text-sm font-semibold">
          {count.toString().padStart(2, "0")}
        </p>
      </div>
    </div>
  );
}

function ClinicalCasesDonutChart() {
  const isServerSide = useIsServerSide();
  if (isServerSide) {
    return null;
  }

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
