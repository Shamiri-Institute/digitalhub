"use client";

import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { cn } from "#/lib/utils";
import { constants } from "#/tests/constants";
import { Prisma } from "@prisma/client";
import Link from "next/link";

type Colors = {
  [key: string]: string;
};

type CasesType = Prisma.ClinicalScreeningInfoGetPayload<{
  include: {
    student: true;
    sessions: {
      orderBy: {
        date: "desc";
      };
    };
    currentSupervisor: {
      include: {
        hub: true;
      };
    };
  };
}>;

const colors: Colors = {
  Active: "bg-muted-green",
  FollowUp: "bg-muted-yellow",
  Referred: "bg-muted-pink",
  Terminated: "bg-muted-sky",
};

export function ListViewOfClinicalCases({
  cases = [],
  currentSupervisorId,
}: {
  cases: CasesType[];
  currentSupervisorId?: string;
}) {
  return (
    <div>
      <div className="mx-auto max-w-7xl">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-evenly bg-white">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="No" className="">
              No
            </TabsTrigger>
            <TabsTrigger value="Low">Low</TabsTrigger>
            <TabsTrigger value="Medium">Medium</TabsTrigger>
            <TabsTrigger value="High">High</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <ClinicalCasses
              cases={cases}
              option={"all"}
              currentSupervisorId={currentSupervisorId}
            />
          </TabsContent>
          <TabsContent value="No">
            <ClinicalCasses
              cases={cases}
              option={"No"}
              currentSupervisorId={currentSupervisorId}
            />
          </TabsContent>
          <TabsContent value="Low">
            <ClinicalCasses
              cases={cases}
              option={"Low"}
              currentSupervisorId={currentSupervisorId}
            />
          </TabsContent>
          <TabsContent value="Medium">
            <ClinicalCasses
              cases={cases}
              option={"Medium"}
              currentSupervisorId={currentSupervisorId}
            />
          </TabsContent>
          <TabsContent value="High">
            <ClinicalCasses
              cases={cases}
              option={"High"}
              currentSupervisorId={currentSupervisorId}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ClinicalCasses({
  option,
  cases = [],
  currentSupervisorId,
}: {
  option: "all" | "No" | "Low" | "Medium" | "High";
  cases?: CasesType[];
  currentSupervisorId?: string;
}) {
  const newList = cases.filter((item) => {
    if (option === "all") return true;
    if (item.riskStatus === option) return true;
  });

  return (
    <Card
      className="my-2 gap-5 bg-white p-4 pr-3.5"
      data-testid={constants.CLINICAL_CASES_LIST}
    >
      <div className="mb-2 flex flex-1 justify-between">
        {currentSupervisorId && (
          <p className="flex-1 text-base font-medium text-muted-foreground">
            Hub
          </p>
        )}
        {currentSupervisorId && (
          <p className="flex-1 text-base font-medium text-muted-foreground">
            Supervisor
          </p>
        )}
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
          currentSupervisorId={currentSupervisorId}
          hubName={stud.currentSupervisor.hub?.hubName}
          supervisor={stud.currentSupervisor.supervisorName}
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
  supervisor,
  currentSupervisorId,
  hubName,
}: {
  name: string | null;
  session: string;
  risk: string;
  status: string;
  caseId: string;
  supervisor: string | null;
  currentSupervisorId?: string;
  hubName?: string;
}) {
  return (
    <Link href={`/screenings/${caseId}`}>
      <div className="mt-2 flex flex-1 items-center justify-between border-b last:border-none">
        {currentSupervisorId && (
          <p className="flex-1 text-left text-sm text-brand">{hubName}</p>
        )}
        {currentSupervisorId && (
          <p className="flex-1 text-left text-sm text-brand">{supervisor}</p>
        )}
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
