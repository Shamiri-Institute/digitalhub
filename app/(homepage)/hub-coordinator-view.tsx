"use client";

import * as React from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { batchUploadFellows } from "#/app/actions";
import { Header } from "#/app/(homepage)/common";

export function HubCoordinatorView() {
  return (
    <div>
      <Header />
      <div className="max-w-fit my-5 xl:mt-10">
        <FellowsBatchUploader />
      </div>
    </div>
  );
}

function FellowsBatchUploader() {
  return (
    <form action={batchUploadFellows}>
      <label className="border border-border rounded-xl px-6 py-6 flex flex-col gap-4">
        <div className="text-muted-foreground">
          The file you upload must be a CSV file with exactly the following
          columns:
          <ul className="list-disc list-inside">
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
