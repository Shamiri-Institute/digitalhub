"use client";

import { format } from "date-fns";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "#/components/ui/dropdown-menu";
import type { PayoutHistoryEntry } from "#/lib/actions/expenses/payout-history";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

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
          `"${formatMpesaNumber(fellow.mpesaNumber ?? "")}"`,
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
      <RowActionsTrigger
        label={`Actions for the payout of ${format(payout.dateAdded, "dd-MM-yyyy HH:mm:ss")}`}
        className="bg-white"
      />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>

        <DropdownMenuItem onSelect={downloadCSV}>Download .csv</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
