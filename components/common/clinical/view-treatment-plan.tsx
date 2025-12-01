"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";

interface TreatmentPlan {
  id: string;
  createdAt: Date;
  currentORSScore: number | null;
  plannedSessions: number;
  sessionFrequency: string;
  plannedTreatmentIntervention: string[];
  otherTreatmentIntervention: string | null;
  plannedTreatmentInterventionExplanation: string;
}

interface ViewTreatmentPlanProps {
  children: React.ReactNode;
  treatmentPlan: TreatmentPlan | null;
  pseudonym: string;
}

export function ViewTreatmentPlan({ children, treatmentPlan, pseudonym }: ViewTreatmentPlanProps) {
  const [open, setOpen] = useState(false);

  const formatSessionFrequency = (frequency: string) => {
    switch (frequency) {
      case "once_week":
        return "Once a week";
      case "twice_week":
        return "Twice a week";
      case "biweekly":
        return "Once every two weeks";
      default:
        return frequency;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Treatment Plan - {pseudonym}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {!treatmentPlan ? (
            <div className="p-4 text-center text-muted-foreground">
              No treatment plan available for this case.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-sm font-medium">Treatment Plan Details</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(treatmentPlan.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p>
                      <strong>Current ORS Score:</strong>{" "}
                      {treatmentPlan.currentORSScore || "Not specified"}
                    </p>
                    <p>
                      <strong>Planned Sessions:</strong> {treatmentPlan.plannedSessions}
                    </p>
                    <p>
                      <strong>Session Frequency:</strong>{" "}
                      {formatSessionFrequency(treatmentPlan.sessionFrequency)}
                    </p>
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="space-y-2">
                  <div>
                    <p className="text-sm">
                      <strong>Planned Treatment Interventions:</strong>
                    </p>
                    <ul className="ml-4 mt-1 list-disc text-sm">
                      {treatmentPlan.plannedTreatmentIntervention.map((intervention) => (
                        <li key={intervention}>{intervention}</li>
                      ))}
                    </ul>
                  </div>
                  {treatmentPlan.otherTreatmentIntervention && (
                    <div>
                      <p className="text-sm">
                        <strong>Other Intervention:</strong>{" "}
                        {treatmentPlan.otherTreatmentIntervention}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm">
                      <strong>Treatment Intervention Explanation:</strong>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {treatmentPlan.plannedTreatmentInterventionExplanation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
