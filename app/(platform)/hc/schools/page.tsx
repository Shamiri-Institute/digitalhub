import { Button } from "#/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "#/components/ui/command";
import PageHeading from "#/components/ui/page-heading";
import { Select, SelectGroup, SelectContent, SelectTrigger, SelectValue, SelectItem } from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import Image from "next/image";
import AddCircleOutlined from '../../../../public/icons/add-circle-outline.svg';
import SettingsIcon from '../../../../public/icons/settings-icon.svg';
import ChartCard from "#/components/ui/chart-card";

const dummySchools = [
  'Komothai High School',
  'Alliance High School',
  'Pangani Girls High School'
]

export default function SchoolsPage() {
  return (
    <>
      <PageHeading title="Schools" />
      <Separator className="my-5" />
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <Command className="rounded border max-w-64">
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
          <Button className="flex items-center gap-2 text-base bg-shamiri-new-blue font-semibold text-white leading-6">
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
          <Button className="flex items-center gap-2 text-sm bg-white font-semibold text-shamiri-black leading-5">
            Edit Columns
            <Image
              unoptimized
              priority
              src={SettingsIcon}
              alt="Setting Icon"
              width={24}
              height={24}
            />
          </Button>
          {/* TODO: dispaly options button */}
        </div>
      </div>
      {/* TODO: better to use grid here for responsive views */}
      <div className="flex justify-between py-5">
        <ChartCard title="Attendance" />
        <ChartCard title="Drop-out reasons" />
        <ChartCard title="School information completion" />
        <ChartCard title="Ratings" />
      </div>
      <Separator />
      <div className="pt-5">
      </div>
    </>
  )
}
