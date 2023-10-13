"use client";

import { Header } from "#/app/(platform)/common";
import { batchUploadFellows } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";

export function HubCoordinatorView() {
  return (
    <div>
      <Header />
      <div className="my-5 grid max-w-fit grid-cols-2 xl:mt-10">
        {/* <div>
          <Card>
            <CardHeader>Supervisor Fellow Matching</CardHeader>
          </Card>
        </div> */}
        <FellowsBatchUploader />
      </div>
    </div>
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
