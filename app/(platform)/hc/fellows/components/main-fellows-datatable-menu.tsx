import { ImplementerRole } from "#/db/enums";
import type {
  MainFellowDialogKind,
  MainFellowTableData,
} from "#/app/(platform)/hc/fellows/components/columns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

export default function MainFellowsDatatableMenu({
  fellow,
  openDialog,
  openEditDialog,
  openWeeklyEvaluationDialog,
  role,
}: {
  fellow: MainFellowTableData;
  openDialog: (kind: MainFellowDialogKind, fellow: MainFellowTableData) => void;
  openEditDialog: (fellow: MainFellowTableData) => void;
  openWeeklyEvaluationDialog: (fellow: MainFellowTableData) => void;
  role: ImplementerRole;
}) {
  return (
    <DropdownMenu>
      <RowActionsTrigger label={`Actions for ${fellow.fellowName}`} className="bg-white" />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-muted-foreground">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === ImplementerRole.ADMIN ? (
          <>
            <DropdownMenuItem onClick={() => openEditDialog(fellow)}>
              View fellow information
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openWeeklyEvaluationDialog(fellow)}>
              View weekly fellow evaluation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog("complaints", fellow)} disabled={true}>
              View complaints
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => openEditDialog(fellow)}>
              Edit fellow information
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog("complaints", fellow)}>
              Submit complaint
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openWeeklyEvaluationDialog(fellow)}>
              View weekly fellow evaluation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog("dropout", fellow)}>
              {fellow.droppedOut ? (
                <div className="text-destructive">Undo drop out</div>
              ) : (
                <div className="text-destructive">Drop-out fellow</div>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
