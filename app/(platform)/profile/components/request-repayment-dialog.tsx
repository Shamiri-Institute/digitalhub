import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { AlertTriangleIcon } from "lucide-react";
import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";

export function RequestRepaymentDialog({
  fellow,
  children,
}: {
  fellow: Prisma.FellowGetPayload<{}>;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="text-lg font-medium">
            Request Repayment for {fellow.fellowName}
          </div>
        </DialogHeader>
        <Separator />
        <div className="my-2 space-y-6">
          <MPESADisclaimer />
        </div>
        <div className="flex justify-center text-4xl font-bold">
          {fellow.mpesaNumber}
        </div>
        <RepaymentRequestHistory
          repaymentRequests={[
            {
              date: "2022-01-01",
              schoolName: "School 1",
              sessionNumber: 1,
              mpesaNumber: "1234567890",
            },
            {
              date: "2022-02-01",
              schoolName: "School 2",
              sessionNumber: 2,
              mpesaNumber: "0987654321",
            },
          ]}
        />
      </DialogContent>
    </Dialog>
  );
}

function MPESADisclaimer() {
  return (
    <div className="rounded-md bg-yellow-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangleIcon
            className="h-5 w-5 text-yellow-400"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            Confirm the below MPESA number is the correct one for this fellow.
            If it is not, please edit the information before requesting a
            repayment.
          </p>
        </div>
      </div>
    </div>
  );
}

interface RepaymentRequest {
  date: string;
  schoolName: string;
  sessionNumber: number;
  mpesaNumber: string;
}

function RepaymentRequestHistory({
  repaymentRequests,
}: {
  repaymentRequests: RepaymentRequest[];
}) {
  if (repaymentRequests.length === 0) {
    return null;
  }

  return (
    <div className="my-2 space-y-2">
      <h2 className="mb-2 text-sm font-medium">
        {repaymentRequests.length} Previous Requests
      </h2>
      <table className="w-full table-auto text-xs">
        <thead className="rounded-xl bg-zinc-100 text-xs text-zinc-700">
          <tr>
            <th className="px-2 py-1">Date</th>
            <th className="px-2 py-1">Session</th>
            <th className="px-2 py-1">MPESA</th>
          </tr>
        </thead>
        <tbody>
          {repaymentRequests.map((request, index) => (
            <tr key={index} className="border-gray-200 text-center">
              <td className="px-2 py-1">
                {format(new Date(request.date), "dd/MM/yyyy")}
              </td>
              <td className="px-2 py-1">
                {request.schoolName} — Session {request.sessionNumber}
              </td>
              <td className="px-2 py-1">{request.mpesaNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
