"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import type { SurveyListItem } from "../queries";
import { columns } from "./columns";
import CreateSurveyDialog from "./create-survey-dialog";

export default function SurveysDataTable({ surveys }: { surveys: SurveyListItem[] }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <DataTable
        data={surveys}
        columns={columns}
        className="data-table bg-white lg:mt-4"
        emptyStateMessage="No surveys yet"
        getRowCanExpand={() => false}
        renderTableActions={
          <Button variant="brand" className="flex gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New survey
          </Button>
        }
      />
      <CreateSurveyDialog open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
