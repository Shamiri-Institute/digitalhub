import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { NestedDialogMenuItem, RowActionsTrigger } from "#/components/common/row-actions-menu";

export default function ViewEditReportDropdown({
  triggerLabel,
  viewLabel,
  editLabel,
  renderDialog,
}: {
  triggerLabel: string;
  viewLabel: string;
  editLabel: string;
  renderDialog: (action: "view" | "edit", children: ReactNode) => ReactNode;
}) {
  return (
    <DropdownMenu>
      <RowActionsTrigger label={triggerLabel} className="bg-white" />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-muted-foreground">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {renderDialog("view", <NestedDialogMenuItem>{viewLabel}</NestedDialogMenuItem>)}
        {renderDialog("edit", <NestedDialogMenuItem>{editLabel}</NestedDialogMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
