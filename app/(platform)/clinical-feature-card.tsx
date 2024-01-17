"use client";

import Link from "next/link";
import { Cell, Pie, PieChart } from "recharts";

import { Icons } from "#/components/icons";
import { Card } from "#/components/ui/card";
import { useIsServerSide } from "#/lib/hooks/use-is-server-side";
import { cn } from "#/lib/utils";
import { ClinicalScreeningInfo } from "@prisma/client";

const colors = ["#7EA16B", "#FABC2A", "#B0D5EA"];

export function ClinicalFeatureCard({
  clinicalCases,
}: {
  clinicalCases: ClinicalScreeningInfo[];
}) {
  type CaseData = { name: "Active" | "FollowUp" | "Terminated"; value: number };

  const data = [
    { name: "Active", value: 0 },
    { name: "FollowUp", value: 0 },
    { name: "Terminated", value: 0 },
  ];

  clinicalCases.forEach((case_) => {
    if (case_.caseStatus === "Active") {
      (data[0] as CaseData).value += 1;
    } else if (case_.caseStatus === "FollowUp") {
      (data[1] as CaseData).value += 1;
    } else if (case_.caseStatus === "Terminated") {
      (data[2] as CaseData).value += 1;
    }
  });

  return (
    <Link href="/screenings" className="col-span-2">
      <Card className="flex flex-col gap-5 bg-active-card px-6 py-5">
        <div>
          <div className="flex gap-4 align-middle text-base text-active-card-foreground">
            <Icons.heartHandshake className="h-4 w-4 align-baseline xl:h-7 xl:w-7" />
            <div className="font-medium xl:text-2xl">Clinical cases</div>
          </div>
        </div>
        <div className="flex justify-between gap-6">
          <div className="h-[100px] w-[100px] shrink-0 rounded-full">
            <ClinicalCasesDonutChart data={data} />
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
              count={data.find((d) => d.name === "FollowUp")?.value!}
            />
            <LegendItem
              colorClass="bg-muted-sky"
              label="Terminated"
              count={data.find((d) => d.name === "Terminated")?.value!}
            />
            <div className="flex justify-between border-b border-border/40 pb-1 last:border-none">
              <p className="text-sm font-semibold text-white">Total</p>
              <div className={cn("rounded-sm px-3")}>
                <p className="text-sm font-semibold text-white">
                  {data
                    .reduce((acc, curr) => acc + curr.value, 0)
                    .toString()
                    .padStart(2, "0")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function formatNumber(num: number | undefined) {
  if (num === undefined) {
    return "".padStart(2, "0");
  }
  return num.toString().padStart(2, "0");
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
    <div className="flex justify-between border-b border-border/40 pb-1 last:border-none">
      <p className="text-sm font-semibold text-white">{label}</p>
      <div className={cn("rounded-sm px-3", colorClass)}>
        <p className="text-sm font-semibold text-white">
          {formatNumber(count)}
        </p>
      </div>
    </div>
  );
}

function ClinicalCasesDonutChart({
  data = [],
}: {
  data: { name: string; value: number }[];
}) {
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
