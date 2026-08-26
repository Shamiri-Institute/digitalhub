import type { ReactNode } from "react";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

/**
 * Shared shell for report-table row actions: the cell-filling trigger and
 * the Actions menu with a View and an Edit item, each wrapped by the
 * report's own view/edit dialog via renderDialog.
 */
export default function ReportActionsDropdown({
  viewLabel,
  editLabel,
  renderDialog,
}: {
  viewLabel: string;
  editLabel: string;
  renderDialog: (action: "view" | "edit", children: ReactNode) => ReactNode;
}) {
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
        <DropdownMenuSeparator />
        {renderDialog(
          "view",
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">{viewLabel}</div>,
        )}
        {renderDialog(
          "edit",
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">{editLabel}</div>,
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
