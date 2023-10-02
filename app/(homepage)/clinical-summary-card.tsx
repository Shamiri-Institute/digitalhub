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

export function ClinicalSummaryCard() {
  return (
    <Card className="p-5 pr-3.5 flex flex-col gap-5 pt-3.5 pl-3.5 w-full">
      <div>
        <div className="flex items-center gap-1.5 text-base">
          <Icons.heartHandshake className="h-6 w-6" />
          <div className="text-lg font-medium">Clinical cases</div>
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
