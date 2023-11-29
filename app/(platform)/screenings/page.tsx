"use client";

import { batchUploadFellows } from "#/app/actions";
import { useSession } from "#/app/auth.client";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";

import { ClinicalFeatureCard } from "#/app/(platform)/clinical-feature-card";
import { cn } from "#/lib/utils";
import { Separator } from "#/components/ui/separator";
import { Card } from "#/components/ui/card";
import Link from "next/link";
import CreateClinicalCaseDialogue from "#/app/(platform)/screenings/[name]/components/create-clinical-case";


type Colors = {
  [key: string]: string;
};

const colors: Colors = {
  active: "bg-muted-green",
  "follow-up": "bg-muted-yellow",
  referred: "bg-muted-pink",
  terminated: "bg-muted-sky",
};

const sampleReferredCasses = [
  { id: 1, name: "June Kasudi", status: ["Referred"], caseId: "23123kjsdf" },
  { id: 2, name: "Onyango Otieno", status: ["Referred"], caseId: "sd324234" },
  { id: 3, name: "Jonathan Smith", status: ["Referred"], caseId: "2312kdsf" },
  { id: 4, name: "Vivian Hongo", status: ["Referred"], caseId: "823sdf" },
];

export default function ScreeningsPage() {
  return (
    <>
      <ClinicalFeatureCard />
      <CasesReferredToMe />
      <MyClinicalCases />
      <TabsForScreen />
    </>
  );
}


function CasesReferredToMe() {
  return (
    <div className="min-h-[200px]">
      <h3 className="text-base font-semibold text-brand xl:text-2xl mt-5 mb-4">
        Cases referred to you
      </h3>
      <Separator />
      {
        sampleReferredCasses.map((stud) => (
          <RefferedCasesTab key={stud.id} name={stud.name} caseId={stud.caseId} />
        ))
      }
    </div>
  )
}

function MyClinicalCases() {
  return (
    <div className="my-3">
      <div className="flex justify-between my-4">

        <h3 className="text-base font-semibold text-brand xl:text-2xl">
          My Clinical Cases
        </h3>

        <div className="flex">
          <Icons.vshapedHumberger className="h-6 w-6 text-brand mr-6" />
          <CreateClinicalCaseDialogue>
            <Icons.add className="h-6 w-6 text-brand" />
          </CreateClinicalCaseDialogue>
        </div>
      </div>
      <Separator />
    </div>
  )
}

function TabsForScreen() {
  return (
    <div>
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-7xl">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="justify-evenly bg-white w-full">
              <TabsTrigger value="all" >All</TabsTrigger>
              <TabsTrigger value="active" className="">
                Active
              </TabsTrigger>
              <TabsTrigger value="fellow-up">Follow-up</TabsTrigger>
              <TabsTrigger value="terminated">Terminated</TabsTrigger>
              <TabsTrigger value="referred">Referred</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <ClinicalCasses option={"all"} />
            </TabsContent>
            <TabsContent value="active" >
              <ClinicalCasses option={"active"} />
            </TabsContent>
            <TabsContent value="follow-up" >
              <ClinicalCasses option={"follow-up"} />
            </TabsContent>
            <TabsContent value="terminated">
              <ClinicalCasses option={"terminated"} />
            </TabsContent>
            <TabsContent value="referred"><ClinicalCasses option={"referred"} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function RefferedCasesTab({
  name = "",
  caseId = ""
}: {
  name: string;
  caseId: string;
}) {

  const handleAcceptReferredCase = () => {
    if (caseId) {
      // TODO: handle accept case
    }
  }

  const handleRejectReferredCase = () => {
    // TODO: handle reject case
  }

  return (
    <Card
      className={cn("my-2 flex items-center  justify-between gap-5 p-4 pr-3.5bg-white")}
    >
      <p className="text-base font-medium text-brand">{name}</p>
      <div className="flex items-center justify-between">
        <button onClick={handleAcceptReferredCase}>
          <Icons.check className="mx-2 h-6 w-6 align-baseline text-muted-green xl:h-7 xl:w-7" />
        </button>
        <button onClick={handleRejectReferredCase}>
          <Icons.xIcon className="mx-2 h-6 w-6 align-baseline text-shamiri-red xl:h-7 xl:w-7" />
        </button>
      </div>
    </Card>
  )
}




const samplec_clincal_cases = [
  {
    name: "Nishan",
    session: "1",
    risk: "High",
    status: "active",
  },
  {
    name: "Sweet",
    session: "4",
    risk: "Low",
    status: "follow-up",
  },
  {
    name: "Orion",
    session: "3",
    risk: "High",
    status: "terminated",
  },
  {
    name: "Esther",
    session: "2",
    risk: "Mid",
    status: "referred",
  },

]



function ClinicalCasses({ option }: {
  option: "all" | "active" | "follow-up" | "terminated" | "referred"
}) {


  const newList = samplec_clincal_cases.filter((item) => {
    if (option === "all") return true;
    if (item.status === option) return true;

  }
  );



  return (
    <Card
      className={cn("my-2  gap-5 p-4 pr-3.5bg-white")}
    >
      <div className="flex justify-between flex-1 mb-2">
        <p
          className="text-base font-medium text-muted-foreground flex-1">
          Name
        </p>
        <p
          className="text-base font-medium text-muted-foreground flex-1">
          Session
        </p>
        <p
          className="text-base font-medium text-muted-foreground  flex-1">
          Risk
        </p>
        <p
          className="text-base font-medium text-muted-foreground">
          Status
        </p>
      </div>
      <Separator />
      {
        newList.map((stud) => (
          <ClinicalCassesCard key={stud.name}
            name={stud.name}
            session={stud.session}
            risk={stud.risk}
            status={stud.status}
          />
        ))
      }
    </Card>
  )
}

function ClinicalCassesCard({
  name, session, risk, status
}: {
  name: string;
  session: string;
  risk: string;
  status: string;
}
) {
  return (
    <Link href={`/screenings/${name}`}>
      <div
        className={cn("flex justify-between flex-1 mt-2 border-b items-center last:border-none",
          // risk === "High" && "bg-shamiri-red"
        )}
      >
        <p
          className="text-sm text-brand flex-1 text-left">
          {name}
        </p>
        <p
          className="text-sm text-brand flex-1 0">
          {session}
        </p>
        <p
          className={cn("text-sm text-brand flex-1",
            risk === "High" ? "text-shamiri-red" : risk === "Mid" ? "text-muted-yellow" : "text-muted-green"
          )}>
          {risk}
        </p>
        <div
          className={cn(
            "mr-4 flex h-7 w-7 justify-center rounded-full mb-1 items-center",
            colors[status],
          )}
        >
          <p className="text-base font-medium text-white ">
            {status.charAt(0).toUpperCase()}
          </p>
        </div>

      </div>
    </Link>
  )
}