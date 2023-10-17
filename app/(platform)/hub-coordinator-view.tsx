"use client";

import { batchUploadFellows } from "#/app/actions";
import { useSession } from "#/app/auth.client";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";

export function HubCoordinatorView() {
  return (
    <div>
      <Header />
      <div className="my-5 grid max-w-fit grid-cols-2 xl:mt-10">
        <FellowsBatchUploader />
      </div>
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
