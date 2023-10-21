"use client";

import { batchUploadFellows } from "#/app/actions";
import { useSession } from "#/app/auth.client";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";

export function HubCoordinatorView() {
  return (
    <div className="mx-auto max-w-7xl">
      <Header />
      <div>
        <Tabs defaultValue="schools-schedule" className="w-full">
          <TabsList>
            <TabsTrigger value="schools-schedule">Schools Schedule</TabsTrigger>
            <TabsTrigger value="supervisor-schedule">
              Supervisor Schedule
            </TabsTrigger>
            <TabsTrigger value="fellow-schedule">Fellow Schedule</TabsTrigger>
            <TabsTrigger value="recent-pages">Recent Pages</TabsTrigger>
          </TabsList>
          <TabsContent value="schools-schedule">
            <SchoolsScheduleView />
          </TabsContent>
          <TabsContent value="supervisor-schedule">
            Supervisor schedule here.
          </TabsContent>
          <TabsContent value="fellow-schedule">
            Fellow schedule here.
          </TabsContent>
          <TabsContent value="recent-pages">Recent pages here.</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SchoolsScheduleView() {
  return (
    <div className="grid grid-cols-[1fr,3fr]">
      <div>
        <div className="h-40 bg-red-200">
          <StatCard />
        </div>
        <div className="h-40 bg-yellow-200">
          <StatCard />
        </div>
        .
      </div>
      <div className="bg-green-200">
        <div className="flex justify-center text-xl font-semibold">
          Tuesday, 15th Jan 2024
        </div>
      </div>
    </div>
  );
}

function StatCard() {
  return (
    <div className="grid grid-cols-2">
      <div>
        <Icons.schoolMinusOutline className="h-14 w-auto text-brand" />
        <div className="grid grid-cols-[1fr,3fr] gap-2">
          <div className="whitespace-nowrap">Active</div> <div>6</div>
        </div>
        <div className="grid grid-cols-[1fr,3fr] gap-2">
          <div className="whitespace-nowrap">Dropped out</div> <div>1</div>
        </div>
      </div>
      <div></div>
    </div>
  );
}

function Header() {
  const session = useSession();
  console.log({ clientSession: JSON.stringify(session) });

  return (
    <header className="mb-4">
      <div className="flex items-center">
        <h1 className="pr-3 text-2xl font-semibold text-brand">
          Kariobangi Hub
        </h1>
      </div>
      <p className="text-xl text-muted-foreground">
        Hello {session.data?.user.name}, have a nice day!
      </p>
    </header>
  );
}

function FellowsBatchUploader() {
  return (
    <form action={batchUploadFellows}>
      <label className="flex flex-col gap-4 rounded-xl border border-border px-6 py-6">
        <div>
          <h3 className="text-xl font-semibold text-brand">
            Upload fellows in bulk
          </h3>
          <p className="text-muted-foreground">
            Upload a CSV file to add fellows in bulk.
          </p>
        </div>
        <div className="text-muted-foreground">
          The file you upload must be a CSV file with exactly the following
          columns:
          <ul className="list-inside list-disc">
            <li>
              <code>Name</code>
            </li>
            <li>
              <code>Phone</code>
            </li>
            <li>
              <code>Email</code>
            </li>
            <li>
              <code>National ID</code>
            </li>
            <li>
              <code>MPESA Name</code>
            </li>
            <li>
              <code>MPESA Number</code>
            </li>
            <li>
              <code>County</code>
            </li>
            <li>
              <code>Sub-county</code>
            </li>
            <li>
              <code>Date of birth</code>
            </li>
            <li>
              <code>Gender</code>
            </li>
          </ul>
        </div>
        <Input id="csv-file" name="csv-file" type="file" accept="text/csv" />
        <Button variant="brand">Upload</Button>
      </label>
    </form>
  );
}
