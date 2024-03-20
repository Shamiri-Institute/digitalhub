import { currentHubCoordinator } from "#/app/auth";
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
import { fetchDropoutReasons, fetchSchoolData } from "./actions";
import ChartArea from "./components/chart-area";
import { columns } from "./components/columns";
import SchoolsDataTable from "./components/data-table";
import WeeklyHubReportButtonAndForm from "./components/weekly-hub-report-button-and-form";

export default async function SchoolsPage() {
  const hubCoordinator = await currentHubCoordinator();
  // TODO: convert this to Promise.all for concurrent fetch
  const data = await fetchSchoolData(hubCoordinator?.assignedHubId as string);
  const dropoutData = await fetchDropoutReasons(
    hubCoordinator?.assignedHubId as string,
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
          <WeeklyHubReportButtonAndForm />
          {/* TODO: dispaly options button */}
        </div>
      </div>
      {/* TODO: better to use grid here for responsive views */}
      <ChartArea dropoutData={dropoutData} />
      <Separator />
      <div className="pt-5">
        <SchoolsDataTable data={data} columns={columns} />
      </div>
    </>
  );
}
