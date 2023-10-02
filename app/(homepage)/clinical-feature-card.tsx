"use client";

import { DonutChart } from "@tremor/react";

import { Card } from "#/components/ui/card";
import { Icons } from "#/components/icons";

const cities = [
  {
    name: "Active",
    sales: 3,
  },
  {
    name: "Follow-up",
    sales: 7,
  },
  {
    name: "Referred",
    sales: 5,
  },
  {
    name: "Terminated",
    sales: 5,
  },
];

export function ClinicalFeatureCard() {
  return (
    <Card className="px-6 py-5 flex flex-col gap-5 bg-active-card">
      <div>
        <div className="flex align-middle gap-4 text-base text-active-card-foreground">
          <Icons.heartHandshake className="align-baseline h-4 w-4 xl:h-7 xl:w-7" />
          <div className="xl:text-2xl font-medium">Clinical cases</div>
        </div>
      </div>
      <div className="flex justify-between">
        <div className="h-24 w-24 rounded-full">
          <DonutChart
            className="h-24"
            data={cities}
            category="sales"
            index="name"
            valueFormatter={(number: number) => ""}
            colors={["emerald", "amber", "pink", "sky"]}
          />
        </div>
        <div>
          <div className="flex justify-between  border-b border-border/50 pb-1">
            <p className="text-white text-sm font-medium">Active</p>
            <div className="bg-muted-green  px-3 rounded-md">
              <p className="text-white text-sm font-medium">03</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
