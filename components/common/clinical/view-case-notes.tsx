"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";

interface CaseNote {
  id: string;
  createdAt: Date;
  presentingIssues: string;
  orsAssessment: number;
  riskLevel: string;
  necessaryConditions: string;
  treatmentInterventions: string[];
  otherIntervention: string;
  interventionExplanation: string;
  emotionalResponse: string;
  behavioralResponse: string;
  overallFeedback: string;
  studentResponseExplanations: string;
  followUpPlan: string;
  followUpPlanExplanation: string;
  sessionId: string;
}

interface ViewCaseNotesProps {
  children: React.ReactNode;
  caseNotes: CaseNote[];
  pseudonym: string;
}

export function ViewCaseNotes({ children, caseNotes, pseudonym }: ViewCaseNotesProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Case Notes - {pseudonym}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {caseNotes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No case notes available for this case.
            </div>
          ) : (
            <div className="space-y-4">
              {caseNotes.map((note) => (
                <div key={note.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="text-sm font-medium">
                      Presenting Issues: {note.presentingIssues}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <strong>Risk Level:</strong> {note.riskLevel}
                      </p>
                      <p>
                        <strong>ORS Assessment:</strong> {note.orsAssessment}
                      </p>
                      <p>
                        <strong>Necessary Conditions:</strong> {note.necessaryConditions}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm">
                        <strong>Treatment Interventions:</strong>
                      </p>
                      <ul className="ml-4 mt-1 list-disc text-sm">
                        {note.treatmentInterventions.map((intervention, index) => (
                          <li key={index}>{intervention}</li>
                        ))}
                      </ul>
                    </div>
                    {note.otherIntervention && (
                      <div>
                        <p className="text-sm">
                          <strong>Other Intervention:</strong> {note.otherIntervention}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm">
                        <strong>
                          Intervention Explanation (what techniques, approaches and tools were
                          used?):
                        </strong>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {note.interventionExplanation}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-sm">
                    <strong>Overall Feedback:</strong> {note.overallFeedback}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    <strong>Student Response:</strong> {note.studentResponseExplanations}
                  </p>
                  <p className="mt-2 text-sm">
                    <strong>Follow-up Plan:</strong> {note.followUpPlan} -{" "}
                    {note.followUpPlanExplanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
