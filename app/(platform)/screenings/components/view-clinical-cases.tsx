"use client";

import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { cn } from "#/lib/utils";
import { constants } from "#/tests/constants";
import {
  ClinicalScreeningInfo,
  ClinicalSessionAttendance,
  Student,
} from "@prisma/client";
import Link from "next/link";

type Colors = {
  [key: string]: string;
};

type CasesType = ClinicalScreeningInfo & {
  student: Student;
  sessions: ClinicalSessionAttendance[];
};

const colors: Colors = {
  Active: "bg-muted-green",
  FollowUp: "bg-muted-yellow",
  Referred: "bg-muted-pink",
  Terminated: "bg-muted-sky",
};

export function ListViewOfClinicalCases({
  cases = [],
}: {
  cases: CasesType[];
}) {
  return (
    <div>
      <div className="mx-auto max-w-7xl">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-evenly bg-white">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Active" className="">
              Active
            </TabsTrigger>
            <TabsTrigger value="FollowUp">Follow-up</TabsTrigger>
            <TabsTrigger value="Terminated">Terminated</TabsTrigger>
            <TabsTrigger value="Referred">Referred</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <ClinicalCasses cases={cases} option={"all"} />
          </TabsContent>
          <TabsContent value="Active">
            <ClinicalCasses cases={cases} option={"Active"} />
          </TabsContent>
          <TabsContent value="FollowUp">
            <ClinicalCasses cases={cases} option={"FollowUp"} />
          </TabsContent>
          <TabsContent value="Terminated">
            <ClinicalCasses cases={cases} option={"Terminated"} />
          </TabsContent>
          <TabsContent value="Referred">
            <ClinicalCasses cases={cases} option={"Referred"} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ClinicalCasses({
  option,
  cases = [],
}: {
  option: "all" | "Active" | "FollowUp" | "Terminated" | "Referred";
  cases?: CasesType[];
}) {
  const newList = cases.filter((item) => {
    if (option === "all") return true;
    if (item.caseStatus === option) return true;
  });

  return (
    <Card
      className="my-2 gap-5 bg-white p-4 pr-3.5"
      data-testid={constants.CLINICAL_CASES_LIST}
    >
      <div className="mb-2 flex flex-1 justify-between">
        <p className="flex-1 text-base font-medium text-muted-foreground">
          Name
        </p>
        <p className="flex-1 text-base font-medium text-muted-foreground">
          Session
        </p>
        <p className="flex-1 text-base font-medium  text-muted-foreground">
          Risk
        </p>
        <p className="text-base font-medium text-muted-foreground">Status</p>
      </div>
      <Separator />
      {newList.map((stud) => (
        <ClinicalCassesCard
          key={stud.id}
          caseId={stud.id}
          name={stud.student.studentName}
          session={
            stud.sessions
              .findLast((session) => session.session)
              ?.session.toString() ?? "0"
          }
          risk={stud.riskStatus}
          status={stud.caseStatus}
        />
      ))}

      {newList.length === 0 && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-base font-medium text-muted-foreground">
            No clinical cases yet...
          </p>
        </div>
      )}
    </Card>
  );
}

function ClinicalCassesCard({
  name = "",
  session,
  risk,
  status,
  caseId,
}: {
  name: string | null;
  session: string;
  risk: string;
  status: string;
  caseId: string;
}) {
  return (
    <Link href={`/screenings/${caseId}`}>
      <div className="mt-2 flex flex-1 items-center justify-between border-b last:border-none">
        <p
          className="flex-1 text-left text-sm text-brand"
          data-testid={constants.CLINICAL_CASES_LIST_NAME}
        >
          {name}
        </p>
        <p className="flex-1 text-sm text-brand">{session}</p>
        <p
          className={cn(
            "flex-1 text-sm text-brand",
            risk === "High"
              ? "text-shamiri-red"
              : risk === "Mid"
              ? "text-muted-yellow"
              : "text-muted-green",
          )}
        >
          {risk}
        </p>
        <div
          className={cn(
            "mb-1 mr-4 flex h-7 w-7 items-center justify-center rounded-full",
            colors[status],
          )}
        >
          <p className="text-base font-medium text-white ">
            {status.charAt(0).toUpperCase()}
          </p>
        </div>
      </div>
    </Link>
  );
}
