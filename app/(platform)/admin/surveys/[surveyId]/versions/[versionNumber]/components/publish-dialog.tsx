"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { toast } from "#/components/ui/use-toast";
import { SURVEY_VERSION_PREFILL_LABELS, SurveyVersionPrefill } from "#/db/enums";
import { publishVersion } from "#/lib/actions/survey";
import type { LockedQuestion } from "#/lib/survey/check-form";
import type { SurveyForm } from "#/lib/survey/form";
import { describeProblem, type Prefill } from "#/lib/survey/layout";
import { checkPublish } from "#/lib/survey/publish";

/** What each prefill prints on every copy, in the publisher's words. */
const PREFILL_DESCRIPTIONS: Record<Prefill, string> = {
  NONE: "Each copy prints its serial only; respondents write in who they are.",
  SCHOOL: "Each copy prints its serial and the name of the school it is printed for.",
  STUDENT: "Each copy prints its serial and the name and ID of the student it is printed for.",
};

interface PublishDialogProps {
  versionId: string;
  versionNumber: number;
  revision: number;
  form: SurveyForm;
  locked: LockedQuestion[];
  unsaved: boolean;
}

/** Publishes the saved draft: choose what each copy prints, then confirm. */
export default function PublishDialog(props: PublishDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="brand">
          Publish
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <PublishSteps {...props} close={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PublishSteps({
  versionId,
  versionNumber,
  revision,
  form,
  locked,
  unsaved,
  close,
}: PublishDialogProps & { close: () => void }) {
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const [prefill, setPrefill] = useState<Prefill>(SurveyVersionPrefill.NONE);
  const [publishing, setPublishing] = useState(false);
  const [refusal, setRefusal] = useState<string>();

  const check = checkPublish(form, locked, prefill);
  // Two problems can read the same, so each message shows once.
  const reasons = check.ok
    ? []
    : [
        ...new Set([
          ...check.issues.map((issue) => issue.message),
          ...check.problems.map((problem) => describeProblem(problem, form)),
        ]),
      ];

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const response = await publishVersion({ versionId, revision, prefill });
      if (response.success) {
        toast({ description: response.message });
        close();
        return;
      }
      setRefusal(response.message);
    } catch {
      setRefusal("Sorry, could not publish. Reload to see whether it was published.");
    } finally {
      setPublishing(false);
    }
  };

  if (step === "confirm") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Publish v{versionNumber}?</DialogTitle>
          <DialogDescription>
            Publishing freezes v{versionNumber}&apos;s questions, print layout and header (
            {SURVEY_VERSION_PREFILL_LABELS[prefill].toLowerCase()}). It can&apos;t be undone; later
            changes go in a new draft.
          </DialogDescription>
        </DialogHeader>
        {refusal && (
          <Alert variant="destructive">
            <AlertDescription>{refusal}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={publishing}
            onClick={() => {
              setRefusal(undefined);
              setStep("choose");
            }}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="brand"
            loading={publishing}
            disabled={publishing || refusal !== undefined}
            onClick={() => void handlePublish()}
          >
            Publish v{versionNumber}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Publish v{versionNumber}</DialogTitle>
        <DialogDescription>
          Choose what the header of every printed copy shows besides its serial. It is printed on
          every page and can&apos;t change after publishing.
        </DialogDescription>
      </DialogHeader>
      <RadioGroup
        value={prefill}
        onValueChange={(value) => setPrefill(value as Prefill)}
        aria-label="What each copy prints"
        className="gap-3"
      >
        {Object.values(SurveyVersionPrefill).map((option) => (
          <Label
            key={option}
            htmlFor={`prefill-${option}`}
            className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-shamiri-new-blue has-[[data-state=checked]]:bg-blue-bg"
          >
            <RadioGroupItem id={`prefill-${option}`} value={option} className="mt-0.5" />
            <span className="space-y-1">
              <span className="block text-sm font-semibold">
                {SURVEY_VERSION_PREFILL_LABELS[option]}
              </span>
              <span className="block text-sm font-normal text-shamiri-text-grey">
                {PREFILL_DESCRIPTIONS[option]}
              </span>
            </span>
          </Label>
        ))}
      </RadioGroup>
      {unsaved ? (
        <Alert variant="destructive">
          <AlertDescription>
            Save your changes first: publishing uses the saved form.
          </AlertDescription>
        </Alert>
      ) : (
        reasons.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <p>Fix these before publishing:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="brand"
          disabled={unsaved || reasons.length > 0}
          onClick={() => setStep("confirm")}
        >
          Continue
        </Button>
      </DialogFooter>
    </>
  );
}
