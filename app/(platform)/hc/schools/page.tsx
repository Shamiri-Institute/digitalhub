import { getCurrentPersonnel } from "#/app/auth";
import { Button } from "#/components/ui/button";
import ChartCard from "#/components/ui/chart-card";
import { Command, CommandInput } from "#/components/ui/command";
import PageHeading from "#/components/ui/page-heading";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import Image from "next/image";
import AddCircleOutlined from "../../../../public/icons/add-circle-outline.svg";
import {
  fetchDropoutReasons,
  fetchSchoolData,
  fetchSessionAttendanceData,
} from "./actions";
import ChartArea from "./components/chart-area";
import { columns } from "./components/columns";
import SchoolsDataTable from "./components/data-table";

export default async function SchoolsPage() {
  const hubCoordinator = await getCurrentPersonnel();
  // TODO: convert this to Promise.all for concurrent fetch
  const data = await fetchSchoolData(hubCoordinator.assignedHubId);
  const dropoutData = await fetchDropoutReasons(hubCoordinator.assignedHubId);
  const sessionAttendanceData = await fetchSessionAttendanceData(
    hubCoordinator.assignedHubId,
  );

  return (
    <>
      <PageHeading title="Schools" />
      <Separator className="my-5" />
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Command className="max-w-64 rounded border">
            <CommandInput placeholder="Search Schools" />
            {/*
            <CommandList>
              <CommandEmpty>No schools found</CommandEmpty>
              {dummySchools.map(sch => (
                <CommandItem>
                  {sch}
                </CommandItem>
              ))}
            </CommandList>
            */}
          </Command>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="hub">Hub</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Button className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white">
            <Image
              unoptimized
              priority
              src={AddCircleOutlined}
              alt="Add icon circle outlined"
              width={24}
              height={24}
            />
            Weekly Hub Report
          </Button>
          {/* TODO: dispaly options button */}
        </div>
      </div>
      {/* TODO: better to use grid here for responsive views */}
      <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
        <ChartCard title="Attendance" />
        <ChartArea
          dropoutData={dropoutData}
          sessionAttendanceData={sessionAttendanceData}
        />
        <ChartCard title="School information completion" />
        <ChartCard title="Ratings" />
      </div>
      <Separator />
      <div className="pt-5">
        <SchoolsDataTable data={data} columns={columns} />
      </div>
    </>
  );
}
