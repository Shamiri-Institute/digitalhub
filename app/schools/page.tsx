import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";

export default function SchoolsPage() {
  return (
    <>
      <Header />
      <SchoolsList />
    </>
  );
}

function Header() {
  return (
    <div className="flex justify-between mb-4">
      <div className="flex align-middle bg-green items-center">
        <Icons.schoolMinusOutline className="h-4 w-4 text-brand mr-4 align-baseline" />
        <h3 className="font-semibold text-base text-brand">Schools</h3>
      </div>
      <Icons.search className="h-4 w-4 text-brand mr-4 align-baseline" />
    </div>
  );
}

function SchoolsList() {
  const sessionTypes = ["Pre", "S1", "S2", "S3", "S4"];
  const schools = [
    {
      name: "Maranda Sec School",
      population: 1400,
      sessions: ["Pre", "S1"],
      fellowsCount: 15,
      type: "Public",
      county: "Nairobi",
      pointPerson: "Benny Otieno",
      contactNo: "+254712342314780",
      demographics: "Mixed",
      assignedTome: true,
    },
    {
      name: "Our Lady of Fatima High School",
      population: 1400,
      sessions: ["Pre", "S1", "S2", "S3"],
      fellowsCount: 15,
      type: "Public",
      county: "Nairobi",
      pointPerson: "Benny Otieno",
      contactNo: "+254712342314780",
      demographics: "Mixed",
      assignedTome: false,
    },
    {
      name: "Alliance Sec School",
      population: 124,
      sessions: ["Pre"],
      fellowsCount: 9,
      type: "Public",
      county: "Nairobi",
      pointPerson: "Benny Otieno",
      contactNo: "+254712342314780",
      demographics: "Mixed",
      assignedTome: false,
    },
    {
      name: "Maseno Sec School",
      population: 124,
      sessions: [],
      fellowsCount: 9,
      type: "Public",
      county: "Nairobi",
      pointPerson: "Benny Otieno",
      contactNo: "+254712342314780",
      demographics: "Mixed",
      assignedTome: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:grid-cols-3  sm:gap-6">
      {schools.map((school) => (
        <SchoolCard
          key={school.name}
          school={school}
          sessionTypes={sessionTypes}
        />
      ))}
    </div>
  );
}

function SchoolCard({
  school,
  sessionTypes,
}: {
  school: any;
  sessionTypes: any;
}) {
  return (
    <Card
      className={`p-5 pr-3.5 flex flex-col gap-5 ${
        school.assignedTome && "bg-brand"
      } mb-4`}
    >
      <div className="flex items-center gap-4 border-b border-border/50 pb-3 pr-3 justify-between">
        <h3
          className={`font-semibold ${
            school.assignedTome ? "text-white" : "text-brand"
          } text-brand`}
        >
          {school.name}
        </h3>
        <Separator orientation={"vertical"} className="bg-white" />
        <div className="flex flex-col gap-[1px]">
          <p
            className={`font-semibold ${
              school.assignedTome ? "text-white" : "text-brand"
            } text-brand`}
          >
            {school.population}
          </p>
          <p className="text-xs text-muted-foreground font-medium">Students</p>
        </div>
      </div>

      <div className="flex gap-2 justify-between">
        <div className="flex gap-3">
          {sessionTypes.map((sessiontype: any) => (
            <div key={sessiontype} className="flex flex-col items-center">
              <p className="text-xs text-muted-foreground font-medium">
                {sessiontype}
              </p>
              <div
                className={cn("h-4 w-4 rounded-full", {
                  "bg-green-600": school.sessions.includes(sessiontype),
                  "bg-gray-300": !school.sessions.includes(sessiontype),
                })}
              ></div>
            </div>
          ))}
        </div>
        <Button className="bg-shamiri-blue text-white flex gap-1 hover:bg-shamiri-blue-darker">
          <Icons.users className="h-4 w-4" />
          <p className="text-sm whitespace-nowrap">
            {school.fellowsCount} Fellows
          </p>
        </Button>
      </div>
      <Separator />
      {/* todo: put items on accordion */}

      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger className="items-right">
            <span className="invisible">Shool Detials</span>
          </AccordionTrigger>

          <AccordionContent>
            <div>
              <p
                className={`${
                  school.assignedTome ? "text-white" : "text-brand"
                } font-medium text-sm pb-2`}
              >
                Type: {school.type}
              </p>
              <p
                className={`${
                  school.assignedTome ? "text-white" : "text-brand"
                } font-medium text-sm pb-2`}
              >
                County: {school.county}
              </p>
              <p
                className={`${
                  school.assignedTome ? "text-white" : "text-brand"
                } font-medium text-sm pb-2`}
              >
                Point person: {school.pointPerson}
              </p>
              <p
                className={`${
                  school.assignedTome ? "text-white" : "text-brand"
                } font-medium text-sm pb-2`}
              >
                Contact number: {school.contactNo}
              </p>
              <p
                className={`${
                  school.assignedTome ? "text-white" : "text-brand"
                } font-medium text-sm pb-2`}
              >
                School demographics: {school.demographics}
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
