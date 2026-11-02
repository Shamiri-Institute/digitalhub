import { useState } from "react";
import {
  type ClinicalCases,
  updateClinicalCasePresentingIssues,
} from "#/app/(platform)/sc/clinical/action";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Textarea } from "#/components/ui/textarea";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

export const emergency_presenting_issues = [
  { id: 1, name: "Bullying" },
  { id: 2, name: "Substance abuse" },
  { id: 3, name: "Sexual abuse" },
  { id: 4, name: "Suicidality" },
  { id: 5, name: "Self-harm" },
  { id: 6, name: "Child abuse" },
  { id: 7, name: "NSSI" },
];

export const emergency_presenting_issues_scale = [
  "Low risk",
  "Moderate risk",
  "High risk",
  "Severe risk",
];

export const general_presenting_issues = [
  { id: 1, name: "Academic issues" },
  { id: 2, name: "Family issues" },
  { id: 3, name: "Peer pressure" },
  { id: 4, name: "Romantic relationship issues" },
  { id: 5, name: "Self esteem issues" },
  { id: 6, name: "Parent-Child Relationships" },
  { id: 7, name: "Student-Teacher Relationships" },
  { id: 8, name: "Sexuality/ Sexual Identity" },
  { id: 9, name: "Unresolved Grief/ Loss" },
  { id: 10, name: "Medical Condition" },
  { id: 11, name: "Self-Perception" },
  { id: 12, name: "Self-Regulation" },
  { id: 13, name: "Anxiety" },
];

type Severity = "Low risk" | "Moderate risk" | "High risk" | "Severe risk";

type Phase = "baseline" | "endpoint";

/** Which presenting issues the board edits: an Active case's baseline, otherwise its endpoint. */
export function presentingIssuesPhase(clinicalCase: Pick<ClinicalCases, "caseStatus">): Phase {
  return clinicalCase.caseStatus === "Active" ? "baseline" : "endpoint";
}

function savedSelections(currentcase: ClinicalCases, phase: Phase) {
  const isBaseline = phase === "baseline";
  const emergency = isBaseline
    ? currentcase.emergencyPresentingIssuesBaseline
    : currentcase.emergencyPresentingIssuesEndpoint;
  const general = isBaseline
    ? currentcase.generalPresentingIssuesBaseline
    : currentcase.generalPresentingIssuesEndpoint;
  const other = isBaseline
    ? currentcase.generalPresentingIssuesOtherSpecifiedBaseline
    : currentcase.generalPresentingIssuesOtherSpecifiedEndpoint;

  const emergencyIssues: Record<string, Severity> = {};
  const generalIssues: Record<string, boolean> = {};
  if (emergency && typeof emergency === "object") {
    for (const issue of emergency_presenting_issues) {
      const severity = (emergency as Record<string, Severity | undefined>)[issue.name];
      if (severity) emergencyIssues[issue.id] = severity;
    }
  }
  if (general && typeof general === "object") {
    for (const issue of general_presenting_issues) {
      if (issue.name in general) generalIssues[issue.id] = true;
    }
  }
  return { emergencyIssues, generalIssues, otherIssues: other || "" };
}

/** The board's selections keyed by issue name, as the case stores them. */
function toPresentingIssues(
  emergencyIssues: Record<string, Severity>,
  generalIssues: Record<string, boolean>,
) {
  const emergency: Record<string, Severity> = {};
  const general: Record<string, string> = {};
  for (const issue of emergency_presenting_issues) {
    const severity = emergencyIssues[issue.id];
    if (severity) emergency[issue.name] = severity;
  }
  for (const issue of general_presenting_issues) {
    if (generalIssues[issue.id]) general[issue.name] = "true";
  }
  return { emergency, general };
}

export function ClinicalDiagnosingBoard({ currentcase }: { currentcase: ClinicalCases }) {
  const phase = presentingIssuesPhase(currentcase);
  const isBaseline = phase === "baseline";
  const saved = savedSelections(currentcase, phase);

  const [emergencyIssues, setEmergencyIssues] = useState(saved.emergencyIssues);
  const [generalIssues, setGeneralIssues] = useState(saved.generalIssues);
  const [otherIssues, setOtherIssues] = useState(saved.otherIssues);
  const [isSaving, setIsSaving] = useState(false);

  const presentingIssues = toPresentingIssues(emergencyIssues, generalIssues);
  const hasChanges =
    JSON.stringify(presentingIssues) !==
      JSON.stringify(toPresentingIssues(saved.emergencyIssues, saved.generalIssues)) ||
    otherIssues !== saved.otherIssues;

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const result = await updateClinicalCasePresentingIssues({
        caseId: currentcase.id,
        emergencyPresentingIssues: presentingIssues.emergency,
        generalPresentingIssues: presentingIssues.general,
        otherIssues: otherIssues,
        phase,
      });
      if (!result.success) {
        toast({ title: "Error", description: result.message, variant: "destructive" });
        return;
      }

      toast({
        title: "Success",
        description: `${isBaseline ? "Baseline" : "Endpoint"} presenting issues updated successfully`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update presenting issues",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const discardChanges = () => {
    setEmergencyIssues(saved.emergencyIssues);
    setGeneralIssues(saved.generalIssues);
    setOtherIssues(saved.otherIssues);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{isBaseline ? "Baseline" : "Endpoint"}</h3>
        <div className="flex flex-col gap-4">
          <EmergencyPresentingIssues
            selectedSeverities={emergencyIssues}
            setSelectedSeverities={setEmergencyIssues}
          />

          <GeneralPresentingIssues
            selectedIssues={generalIssues}
            setSelectedIssues={setGeneralIssues}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="other-issues">
              Other Issues
            </label>
            <Textarea
              id="other-issues"
              value={otherIssues}
              onChange={(e) => setOtherIssues(e.target.value)}
              placeholder="Describe any other presenting issues..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={discardChanges} disabled={!hasChanges}>
              Clear All
            </Button>
            <Button
              variant="brand"
              onClick={toastOnError(handleSaveAll)}
              disabled={!hasChanges || isSaving}
              loading={isSaving}
            >
              {isBaseline ? "Save Baseline" : "Save Endpoint"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmergencyPresentingIssues({
  selectedSeverities,
  setSelectedSeverities,
}: {
  selectedSeverities: Record<string, Severity>;
  setSelectedSeverities: React.Dispatch<React.SetStateAction<Record<string, Severity>>>;
}) {
  const handleSelect = (issueId: string, severity: Severity, checked: boolean) => {
    setSelectedSeverities((prev) =>
      checked
        ? { ...prev, [issueId]: severity }
        : Object.fromEntries(Object.entries(prev).filter(([id]) => id !== issueId)),
    );
  };

  return (
    <div className="w-full space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[50%] border">Emergency presenting issues</TableHead>
            {emergency_presenting_issues_scale.map((scaleItem) => (
              <TableHead key={scaleItem} className="border text-center">
                {scaleItem}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {emergency_presenting_issues.map((issue) => (
            <TableRow key={issue.id} className="hover:bg-gray-50">
              <TableCell className="border font-medium">{issue.name}</TableCell>
              {emergency_presenting_issues_scale.map((severity) => (
                <TableCell key={severity} className="border text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      aria-label={`${issue.name}: ${severity}`}
                      checked={selectedSeverities[issue.id] === severity}
                      onCheckedChange={(checked) =>
                        handleSelect(issue.id.toString(), severity as Severity, checked === true)
                      }
                      className={cn(
                        "h-6 w-6 border",
                        selectedSeverities[issue.id] === severity
                          ? "text-white data-[state=checked]:border-brand data-[state=checked]:bg-brand"
                          : "border-gray-200",
                      )}
                    />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GeneralPresentingIssues({
  selectedIssues,
  setSelectedIssues,
}: {
  selectedIssues: Record<string, boolean>;
  setSelectedIssues: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const handleSelect = (issueId: string, checked: boolean) => {
    setSelectedIssues((prev: Record<string, boolean>) => ({
      ...prev,
      [issueId]: checked,
    }));
  };

  return (
    <div className="w-full space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[75%] border">General presenting issues</TableHead>
            <TableHead className="w-[25%] border text-center">{""}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {general_presenting_issues.map((issue) => (
            <TableRow key={issue.id} className="hover:bg-gray-50">
              <TableCell className="border font-medium">{issue.name}</TableCell>
              <TableCell className="border text-center">
                <div className="flex justify-center">
                  <Checkbox
                    aria-label={issue.name}
                    checked={selectedIssues[issue.id] || false}
                    onCheckedChange={(checked) =>
                      handleSelect(issue.id.toString(), checked as boolean)
                    }
                    className={cn(
                      "h-6 w-6 border",
                      selectedIssues[issue.id]
                        ? "text-white data-[state=checked]:border-brand data-[state=checked]:bg-brand"
                        : "border-gray-200",
                    )}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
