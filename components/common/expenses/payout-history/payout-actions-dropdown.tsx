"use client";

import AddFellowComplaint from "#/components/common/expenses/complaints/add-complaint";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import type { PayoutHistoryEntry } from "#/lib/actions/expenses/payout-history";

function formatMpesaNumber(mpesaNumber: string) {
  const formatted = RenderParsedPhoneNumber(mpesaNumber);
  return typeof formatted === "string" ? formatted : (mpesaNumber ?? "");
}

export default function PayoutActionsDropdown({ payout }: { payout: PayoutHistoryEntry }) {
  function downloadCSV() {
    const headers = [
      "Fellow Name",
      "Hub",
      "Supervisor Name",
      "MPESA Number",
      "Mpesa Name",
      "Amount",
    ];
    const csvContent = [
      headers.join(","),
      ...payout.fellowDetails.map((fellow) =>
        [
          `"${fellow.fellowName}"`,
          `"${fellow.hub}"`,
          `"${fellow.supervisorName}"`,
          `"${formatMpesaNumber(fellow.mpesaNumber)}"`,
          `"${fellow.fellowMpesaName}"`,
          fellow.totalAmount,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payout_${payout.dateAdded.toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l bg-white">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>

        <AddFellowComplaint payout={payout}>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">Add complaint</div>
        </AddFellowComplaint>

        <DropdownMenuItem onSelect={downloadCSV}>Download .csv</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
