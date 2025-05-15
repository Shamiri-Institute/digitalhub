import {
  ClinicalCases,
  updateClinicalCaseEmergencyPresentingIssue,
  updateClinicalCaseGeneralPresentingIssue,
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
import { toast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { useState } from "react";

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

const initializeIssues = (
  issues: typeof emergency_presenting_issues | typeof general_presenting_issues,
  presentingIssues: any,
): Record<string, Severity> => {
  const initialState: Record<string, Severity> = {};

  if (presentingIssues) {
    issues.forEach((issue) => {
      const value = (presentingIssues as Record<string, Severity>)[issue.name];
      if (value) {
        initialState[issue.id.toString()] = value as Severity;
      }
    });
  }

  return initialState;
};

export function ClinicalDiagnosingBoard({
  currentcase,
}: {
  currentcase: ClinicalCases;
}) {
  const isBaseline = currentcase.caseStatus === "Active";

  const initialEmergencyState = isBaseline
    ? currentcase.emergencyPresentingIssuesBaseline
    : currentcase.emergencyPresentingIssuesEndpoint;

  const initialGeneralState = isBaseline
    ? currentcase.generalPresentingIssuesBaseline
    : currentcase.generalPresentingIssuesEndpoint;

  const initialOtherIssues = isBaseline
    ? currentcase.generalPresentingIssuesOtherSpecifiedBaseline || ""
    : currentcase.generalPresentingIssuesOtherSpecifiedEndpoint || "";

  const [emergencyIssues, setEmergencyIssues] = useState<
    Record<string, Severity>
  >(() =>
    initializeIssues(
      emergency_presenting_issues,
      isBaseline
        ? currentcase.emergencyPresentingIssuesBaseline
        : currentcase.emergencyPresentingIssuesEndpoint,
    ),
  );

  const [generalIssues, setGeneralIssues] = useState<Record<string, boolean>>(
    () => {
      const initialState: Record<string, boolean> = {};

      const generalIssuesData = isBaseline
        ? currentcase.generalPresentingIssuesBaseline
        : currentcase.generalPresentingIssuesEndpoint;

      if (generalIssuesData) {
        general_presenting_issues.forEach((issue) => {
          if (
            generalIssuesData &&
            typeof generalIssuesData === "object" &&
            issue.name in generalIssuesData
          ) {
            initialState[issue.id.toString()] = true;
          }
        });
      }

      return initialState;
    },
  );

  const [otherIssues, setOtherIssues] = useState(initialOtherIssues);

  const hasChanges = () => {
    const currentEmergencyData = Object.entries(emergencyIssues).reduce(
      (acc, [id, severity]) => {
        const issueName = emergency_presenting_issues.find(
          (i) => i.id.toString() === id,
        )?.name;
        if (issueName) {
          acc[issueName] = severity;
        }
        return acc;
      },
      {} as Record<string, Severity>,
    );

    const currentGeneralData = Object.entries(generalIssues).reduce(
      (acc, [id, selected]) => {
        const issueName = general_presenting_issues.find(
          (i) => i.id.toString() === id,
        )?.name;
        if (issueName && selected) {
          acc[issueName] = "true";
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    const emergencyChanged =
      JSON.stringify(currentEmergencyData) !==
      JSON.stringify(initialEmergencyState);
    const generalChanged =
      JSON.stringify(currentGeneralData) !==
      JSON.stringify(initialGeneralState);
    const otherIssuesChanged = otherIssues !== initialOtherIssues;

    return emergencyChanged || generalChanged || otherIssuesChanged;
  };

  const handleSaveAll = async () => {
    try {
      const emergencyData = Object.entries(emergencyIssues).reduce(
        (acc, [id, severity]) => {
          const issueName = emergency_presenting_issues.find(
            (i) => i.id.toString() === id,
          )?.name;
          if (issueName) {
            acc[issueName] = severity;
          }
          return acc;
        },
        {} as Record<string, Severity>,
      );

      const generalData = Object.entries(generalIssues).reduce(
        (acc, [id, selected]) => {
          const issueName = general_presenting_issues.find(
            (i) => i.id.toString() === id,
          )?.name;
          if (issueName && selected) {
            acc[issueName] = "true";
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      console.log(emergencyData, generalData, otherIssues);
      await Promise.all([
        updateClinicalCaseEmergencyPresentingIssue({
          caseId: currentcase.id,
          presentingIssues: emergencyData,
          caseStatus: currentcase.caseStatus,
        }),
        updateClinicalCaseGeneralPresentingIssue({
          caseId: currentcase.id,
          generalPresentingIssues: generalData,
          otherIssues: otherIssues,
          caseStatus: currentcase.caseStatus,
        }),
      ]);

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
    }
  };

  const handleClearAll = () => {
    setEmergencyIssues(
      initializeIssues(
        emergency_presenting_issues,
        isBaseline
          ? currentcase.emergencyPresentingIssuesBaseline
          : currentcase.emergencyPresentingIssuesEndpoint,
      ),
    );

    setGeneralIssues(() => {
      const initialState: Record<string, boolean> = {};

      const generalIssuesData = isBaseline
        ? currentcase.generalPresentingIssuesBaseline
        : currentcase.generalPresentingIssuesEndpoint;

      if (generalIssuesData) {
        general_presenting_issues.forEach((issue) => {
          if (
            generalIssuesData &&
            typeof generalIssuesData === "object" &&
            issue.name in generalIssuesData
          ) {
            initialState[issue.id.toString()] = true;
          }
        });
      }

      return initialState;
    });

    setOtherIssues(
      isBaseline
        ? currentcase.generalPresentingIssuesOtherSpecifiedBaseline || ""
        : currentcase.generalPresentingIssuesOtherSpecifiedEndpoint || "",
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">
          {isBaseline ? "Baseline" : "Endpoint"}
        </h3>
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
            <label className="text-sm font-medium">Other Issues</label>
            <Textarea
              value={otherIssues}
              onChange={(e) => setOtherIssues(e.target.value)}
              placeholder="Describe any other presenting issues..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={!hasChanges()}
            >
              Clear All
            </Button>
            <Button
              variant="brand"
              onClick={handleSaveAll}
              disabled={!hasChanges()}
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
  setSelectedSeverities: React.Dispatch<
    React.SetStateAction<Record<string, Severity>>
  >;
}) {
  const handleSelect = (issueId: string, severity: Severity) => {
    setSelectedSeverities((prev: Record<string, Severity>) => ({
      ...prev,
      [issueId]: severity,
    }));
  };

  return (
    <div className="w-full space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[50%] border">
              Emergency presenting issues
            </TableHead>
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
                      checked={selectedSeverities[issue.id] === severity}
                      onCheckedChange={() =>
                        handleSelect(issue.id.toString(), severity as Severity)
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
  setSelectedIssues: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
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
            <TableHead className="w-[75%] border">
              General presenting issues
            </TableHead>
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
