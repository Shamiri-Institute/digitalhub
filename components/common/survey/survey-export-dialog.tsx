"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useDialogSave,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Separator } from "#/components/ui/separator";
import { toast, toastOnError } from "#/components/ui/use-toast";
import {
  type ExportCellValues,
  type ExportCopies,
  EXPORT_MARKERS,
  EXPORTED_COPY_STATUSES,
  MULTIPLE_CODES_SEPARATOR,
  SURVEY_EXPORT_FILES,
  type SurveyExportFile,
  SurveyExportOptionsSchema,
  surveyExportPath,
} from "#/lib/survey/export-options";
import type { ExportChoices } from "#/lib/survey/survey-export";
import { copyCount } from "#/lib/survey/serial";
import { zodResolver } from "#/lib/zod-resolver";

type Choice<T extends string> = { value: T; label: string; hint: string };

const FILE_CHOICES: Choice<SurveyExportFile>[] = [
  { value: "answers", label: "Answers", hint: "A row per copy" },
  { value: "codebook", label: "Codebook", hint: "What each code means" },
];

const COPIES_CHOICES: Choice<ExportCopies>[] = [
  { value: "returned", label: "Scanned", hint: "Any page back" },
  { value: "verified", label: "Verified", hint: "Every answer checked" },
  { value: "all", label: "All printed", hint: "Even unscanned" },
];

const CELL_VALUE_CHOICES: Choice<ExportCellValues>[] = [
  { value: "codes", label: "Codes", hint: "1" },
  { value: "text", label: "Text", hint: "Several days" },
  { value: "both", label: "Both", hint: "1: Several days" },
];

const ExportFormSchema = SurveyExportOptionsSchema.extend({
  file: z.enum(SURVEY_EXPORT_FILES),
});
type ExportFormValues = z.input<typeof ExportFormSchema>;

export function SurveyExportDialog({
  surveyId,
  choices,
}: {
  surveyId: string;
  choices: ExportChoices;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="outline"
        className="gap-2"
        disabled={choices.length === 0}
        onClick={() => setIsOpen(true)}
      >
        <Download className="h-4 w-4" />
        Export data
      </Button>
      <DialogContent className="flex max-h-[90vh] flex-col lg:w-[36rem] lg:max-w-[calc(100vw-2rem)]">
        <SurveyExportForm surveyId={surveyId} choices={choices} onDone={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SurveyExportForm({
  surveyId,
  choices,
  onDone,
}: {
  surveyId: string;
  choices: ExportChoices;
  onDone: () => void;
}) {
  const form = useForm<ExportFormValues>({
    resolver: zodResolver(ExportFormSchema),
    defaultValues: {
      file: "answers",
      versions: choices.map((choice) => choice.versionNumber),
      values: "codes",
      copies: "returned",
    },
  });
  const file = form.watch("file");
  const chosenVersions = form.watch("versions");
  const exportedCopies = form.watch("copies");

  const copiesOf = (choice: ExportChoices[number]) =>
    choice.copyCounts.filter((counted) =>
      EXPORTED_COPY_STATUSES[exportedCopies].includes(counted.status),
    );
  const chosen = choices.filter((choice) => chosenVersions.includes(choice.versionNumber));
  const chosenCopies = chosen.flatMap(copiesOf);
  const copyTotal = chosenCopies.reduce((sum, counted) => sum + counted.copies, 0);
  const schoolTotal = new Set(chosenCopies.map((counted) => counted.schoolId)).size;
  const askDifferentQuestions =
    chosen.length > 1 &&
    new Set(chosen.flatMap((choice) => choice.fields)).size !==
      Math.min(...chosen.map((choice) => choice.fields.length));
  const isAnswers = file === "answers";
  const nothingToExport = isAnswers && copyTotal === 0;

  const { isSaving: isDownloading, save } = useDialogSave();
  const onDownload = (values: ExportFormValues) => {
    const { file: chosenFile, ...options } = ExportFormSchema.parse(values);
    save(async () => {
      const response = await fetch(surveyExportPath(surveyId, chosenFile, options));
      if (!response.ok) {
        toast({
          variant: "destructive",
          // The route's refusals are plain text; anything else, such as a platform error page,
          // is not for the reader.
          description: response.headers.get("content-type")?.startsWith("text/plain")
            ? await response.text()
            : "Sorry, the file could not be made. Try again, or choose fewer copies.",
        });
        return;
      }
      const fileName =
        /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ??
        `${chosenFile}.csv`;
      const fileUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      link.click();
      // Safari and some Firefox versions lose a download whose URL is revoked straight after it starts.
      setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
      onDone();
    });
  };

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={toastOnError(form.handleSubmit(onDownload))}
        className="flex min-h-0 flex-col gap-5"
      >
        <DialogHeader>
          <DialogTitle>Export data</DialogTitle>
          <DialogDescription>Download a CSV file for analysis.</DialogDescription>
        </DialogHeader>
        <div className="-mx-1 flex min-h-0 flex-col gap-5 overflow-y-auto px-1">
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>File</FormLabel>
                <FormControl>
                  <ChoiceGroup
                    name="file"
                    choices={FILE_CHOICES}
                    value={field.value}
                    onValueChange={field.onChange}
                    className="sm:grid-cols-2"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="versions"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Versions</FormLabel>
                <ul className="divide-y rounded-md border">
                  {choices.map((choice) => {
                    const id = `export-version-${choice.versionNumber}`;
                    const versionCopies = copiesOf(choice).reduce(
                      (sum, counted) => sum + counted.copies,
                      0,
                    );
                    return (
                      <li key={choice.versionNumber} className="flex items-center gap-3 px-3 py-2">
                        <Checkbox
                          id={id}
                          checked={field.value.includes(choice.versionNumber)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked === true
                                ? [...field.value, choice.versionNumber]
                                : field.value.filter(
                                    (versionNumber) => versionNumber !== choice.versionNumber,
                                  ),
                            )
                          }
                        />
                        <Label htmlFor={id} className="grow font-medium">
                          v{choice.versionNumber}
                        </Label>
                        <span className="text-sm text-shamiri-text-grey tabular-nums">
                          {isAnswers
                            ? copyCount(versionCopies)
                            : `${choice.fields.length} ${choice.fields.length === 1 ? "field" : "fields"}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <FormMessage />
              </FormItem>
            )}
          />
          {isAnswers && (
            <>
              <FormField
                control={form.control}
                name="copies"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Copies</FormLabel>
                    <FormControl>
                      <ChoiceGroup
                        name="copies"
                        choices={COPIES_CHOICES}
                        value={field.value}
                        onValueChange={field.onChange}
                        className="sm:grid-cols-3"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="values"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Answers as</FormLabel>
                    <FormControl>
                      <ChoiceGroup
                        name="values"
                        choices={CELL_VALUE_CHOICES}
                        value={field.value}
                        onValueChange={field.onChange}
                        className="sm:grid-cols-3"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="space-y-2 rounded-md bg-background-secondary px-3 py-2 text-sm">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt className="text-shamiri-text-grey">Empty</dt>
                  <dd>The student left it blank</dd>
                  <dt className="font-medium">{EXPORT_MARKERS.needsReview}</dt>
                  <dd>The pipeline was unsure; waiting for a reviewer</dd>
                  <dt className="font-medium">{EXPORT_MARKERS.notScanned}</dt>
                  <dd>Its page hasn&rsquo;t been scanned</dd>
                  {askDifferentQuestions && (
                    <>
                      <dt className="font-medium">{EXPORT_MARKERS.notAsked}</dt>
                      <dd>The copy&rsquo;s version didn&rsquo;t print it</dd>
                    </>
                  )}
                </dl>
                <p className="text-shamiri-text-grey">
                  Choices are separated by &ldquo;{MULTIPLE_CODES_SEPARATOR}&rdquo;, which labels
                  may also hold. Any cell starting with = + - @ gets a leading {"'"} so a
                  spreadsheet can&rsquo;t run it.
                </p>
              </div>
            </>
          )}
        </div>
        <Separator />
        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <span className="text-sm text-shamiri-text-grey" aria-live="polite">
            {isAnswers
              ? nothingToExport
                ? "No copies match"
                : `${copyCount(copyTotal)} from ${schoolTotal} ${schoolTotal === 1 ? "school" : "schools"}`
              : `Codebook of ${chosen.map((choice) => `v${choice.versionNumber}`).join(", ") || "no versions"}`}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={onDone} disabled={isDownloading}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={nothingToExport}
              loading={isDownloading}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}

function ChoiceGroup<T extends string>({
  name,
  choices,
  value,
  onValueChange,
  className,
}: {
  name: string;
  choices: Choice<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(chosen) => onValueChange(chosen as T)}
      className={className}
    >
      {choices.map((choice) => {
        const id = `export-${name}-${choice.value}`;
        return (
          <Label
            key={choice.value}
            htmlFor={id}
            className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 font-normal has-[[data-checked]]:border-shamiri-new-blue has-[[data-checked]]:bg-shamiri-new-light-blue/40"
          >
            <RadioGroupItem id={id} value={choice.value} className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{choice.label}</span>
              <span className="text-sm text-shamiri-text-grey">{choice.hint}</span>
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
