"use client";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import WeeklyFellowEvaluation from "#/components/common/fellow/weekly-fellow-evaluation";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { Prisma } from "@prisma/client";
import parsePhoneNumberFromString from "libphonenumber-js";
import { useState } from "react";
import { FellowsData } from "../../actions";
import AddNewFellowForm from "../../components/add-new-fellow-form";
import { columns, subColumns } from "./columns";

function renderTableActions() {
  return (
    <div>
      <AddNewFellowForm>
        <Button>New Fellow</Button>
      </AddNewFellowForm>
    </div>
  );
}

export default function FellowsDataTable({
  fellows,
  project,
  weeklyEvaluations,
}: {
  fellows: FellowsData[];
  project?: Prisma.ProjectGetPayload<{}>;
  weeklyEvaluations: Prisma.WeeklyFellowRatingsGetPayload<{}>[];
}) {
  const [fellow, setFellow] = useState<FellowsData | null>(null);
  const [weeklyEvaluationDialog, setWeeklyEvaluationDialog] = useState(false);

  return (
    <>
      <DataTable
        data={fellows}
        columns={columns({
          setFellow,
          setWeeklyEvaluationDialog,
        })}
        className={"data-table data-table-action mt-4 bg-white"}
        renderTableActions={renderTableActions()}
        renderSubComponent={({ row }) => (
          <DataTable
            data={row.original.sessions}
            editColumns={false}
            columns={subColumns}
            disableSearch={true}
            disablePagination={true}
            className={"data-table data-table-action border-0 bg-white"}
            emptyStateMessage="No groups assigned to this fellow"
          />
        )}
        emptyStateMessage="No fellows assigned to you"
      />
      {fellow && (
        <WeeklyFellowEvaluation
          fellowId={fellow.id}
          open={weeklyEvaluationDialog}
          onOpenChange={setWeeklyEvaluationDialog}
          evaluations={weeklyEvaluations.filter(
            (evaluation) => evaluation.fellowId === fellow.id,
          )}
          project={project}
          mode={"add"}
        >
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>{fellow.fellowName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>
                {fellow.cellNumber &&
                  parsePhoneNumberFromString(
                    fellow.cellNumber,
                    "KE",
                  )?.formatNational()}
              </span>
            </div>
          </DialogAlertWidget>
        </WeeklyFellowEvaluation>
      )}
    </>
  );
}
