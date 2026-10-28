"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
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
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { SURVEY_VERSION_PREFILL_LABELS, SurveyVersionPrefill } from "#/db/enums";
import { createPrintRun, listPrintableStudents } from "#/lib/actions/survey/print-runs";
import { objectId } from "#/lib/crypto";
import type { PrintRunRequest } from "#/lib/survey/print-run";
import type { PrintableHubs } from "#/lib/survey/print-run-queries";
import { MAX_COPIES_PER_RUN } from "#/lib/survey/serial";
import { zodResolver } from "#/lib/zod-resolver";

type PrintedVersion = { id: string; label: string; prefill: SurveyVersionPrefill };

interface PrintRunDialogProps {
  version: PrintedVersion;
  /** The hubs the caller may print for; with one, no hub picker shows. */
  hubs: PrintableHubs;
  /** Where a created run's page lives, as `${runsPath}/${printRunId}`. */
  runsPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintRunDialog({ open, onOpenChange, ...formProps }: PrintRunDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col lg:w-[40rem] lg:max-w-[calc(100vw-2rem)]">
        <PrintRunForm {...formProps} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function PrintCopiesButton(props: Omit<PrintRunDialogProps, "open" | "onOpenChange">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        aria-label={`Print copies of ${props.version.label}`}
        onClick={() => setOpen(true)}
      >
        Print copies
      </Button>
      <PrintRunDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

const PrintRunFormSchema = z.object({
  hubId: z.string().min(1, { error: "Choose a hub" }),
  schools: z.array(
    z.object({
      schoolId: z.string(),
      schoolName: z.string(),
      activeStudents: z.number(),
      copies: z
        .int({ error: "Enter a whole number of copies" })
        .min(0, { error: "Copies can't be negative" })
        .max(MAX_COPIES_PER_RUN, { error: `At most ${MAX_COPIES_PER_RUN} copies` })
        .nullable(),
      included: z.boolean(),
      studentIds: z.array(z.string()).nullable(),
    }),
  ),
});

type PrintRunFormValues = z.infer<typeof PrintRunFormSchema>;
type SchoolRow = PrintRunFormValues["schools"][number];

function schoolRowsOf(hub: PrintableHubs[number] | undefined): SchoolRow[] {
  return (hub?.schools ?? []).map((s) => ({
    schoolId: s.id,
    schoolName: s.schoolName,
    activeStudents: s.activeStudents,
    copies: null,
    included: false,
    studentIds: null,
  }));
}

function copiesOf(row: SchoolRow, printsStudents: boolean) {
  if (!printsStudents) return row.copies ?? 0;
  if (!row.included) return 0;
  return row.studentIds ? row.studentIds.length : row.activeStudents;
}

const copyCount = (count: number) => `${count} ${count === 1 ? "copy" : "copies"}`;

type PendingRun = {
  hubId: string;
  hubName: string;
  request: PrintRunRequest;
  lines: { schoolId: string; schoolName: string; copies: number }[];
  total: number;
};

function PrintRunForm({
  version,
  hubs,
  runsPath,
  onCancel,
}: Omit<PrintRunDialogProps, "open" | "onOpenChange"> & { onCancel: () => void }) {
  const router = useRouter();
  // Made once per open of the dialog: a double click or a retry lands on the same run.
  const [printRunId] = useState(() => objectId("surveyprintrun"));
  const [pending, setPending] = useState<PendingRun | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const printsStudents = version.prefill === SurveyVersionPrefill.STUDENT;

  const [firstHub] = hubs;
  const form = useForm<PrintRunFormValues>({
    resolver: zodResolver(PrintRunFormSchema),
    defaultValues: { hubId: firstHub?.id ?? "", schools: schoolRowsOf(firstHub) },
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "schools" });
  const total = form.watch("schools").reduce((sum, row) => sum + copiesOf(row, printsStudents), 0);

  const onContinue = (values: PrintRunFormValues) => {
    const chosen = values.schools.filter((row) => copiesOf(row, printsStudents) > 0);
    const chosenTotal = chosen.reduce((sum, row) => sum + copiesOf(row, printsStudents), 0);
    if (chosen.length === 0) {
      form.setError("root", { message: "Choose at least one copy to print" });
      return;
    }
    if (chosenTotal > MAX_COPIES_PER_RUN) {
      form.setError("root", { message: `A print run has at most ${MAX_COPIES_PER_RUN} copies` });
      return;
    }
    setPending({
      hubId: values.hubId,
      hubName: hubs.find((h) => h.id === values.hubId)?.hubName ?? "",
      request: printsStudents
        ? {
            kind: "STUDENTS",
            schools: chosen.map((row) => ({ schoolId: row.schoolId, studentIds: row.studentIds })),
          }
        : {
            kind: "COUNTS",
            schools: chosen.map((row) => ({ schoolId: row.schoolId, copies: row.copies ?? 0 })),
          },
      lines: chosen.map((row) => ({
        schoolId: row.schoolId,
        schoolName: row.schoolName,
        copies: copiesOf(row, printsStudents),
      })),
      total: chosenTotal,
    });
  };

  const onCreate = toastOnError(async () => {
    if (!pending) return;
    setIsCreating(true);
    try {
      const response = await createPrintRun({
        printRunId,
        versionId: version.id,
        hubId: pending.hubId,
        request: pending.request,
      });
      if (!response.success) {
        toast({ variant: "destructive", description: response.message });
        return;
      }
      toast({ description: response.message });
      router.push(`${runsPath}/${printRunId}`);
    } finally {
      setIsCreating(false);
    }
  });

  if (pending) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Create the print run?</DialogTitle>
          <DialogDescription>
            Print {copyCount(pending.total)} of {version.label} for {pending.hubName}. Serials are
            assigned when the run is created.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y overflow-y-auto rounded-md border text-sm">
          {pending.lines.map((line) => (
            <li key={line.schoolId} className="flex justify-between gap-4 px-3 py-2">
              <span>{line.schoolName}</span>
              <span className="tabular-nums">{copyCount(line.copies)}</span>
            </li>
          ))}
        </ul>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => setPending(null)}>
            Back
          </Button>
          <Button type="button" onClick={onCreate} disabled={isCreating} loading={isCreating}>
            Create print run
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={toastOnError(form.handleSubmit(onContinue))}
        className="flex min-h-0 flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle>Print copies of {version.label}</DialogTitle>
          <DialogDescription>
            {printsStudents
              ? "One copy per active student of each school you choose, with their name and ID."
              : `${SURVEY_VERSION_PREFILL_LABELS[version.prefill]}: choose how many copies each school gets.`}
          </DialogDescription>
        </DialogHeader>
        {hubs.length > 1 && (
          <FormField
            control={form.control}
            name="hubId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hub</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(hubId) => {
                    field.onChange(hubId);
                    replace(schoolRowsOf(hubs.find((h) => h.id === hubId)));
                  }}
                >
                  <FormControl>
                    <SelectTrigger aria-label="Hub">
                      <SelectValue placeholder="Choose a hub" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {hubs.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.hubName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="min-h-0 divide-y overflow-y-auto rounded-md border">
          {fields.length === 0 && (
            <p className="px-3 py-4 text-sm text-shamiri-text-grey">This hub has no schools.</p>
          )}
          {fields.map((field, index) =>
            printsStudents ? (
              <SchoolStudentsRow key={field.id} index={index} hubId={form.getValues("hubId")} />
            ) : (
              <SchoolCopiesRow key={field.id} index={index} />
            ),
          )}
        </div>
        {form.formState.errors.root && (
          <p className="text-sm font-medium text-shamiri-light-red">
            {form.formState.errors.root.message}
          </p>
        )}
        <Separator />
        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <span className="text-sm text-shamiri-text-grey">
            {copyCount(total)}, serials assigned on create
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Continue</Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}

function SchoolCopiesRow({ index }: { index: number }) {
  const form = useFormContext<PrintRunFormValues>();
  const schoolName = form.getValues(`schools.${index}.schoolName`);
  return (
    <FormField
      control={form.control}
      name={`schools.${index}.copies`}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4 space-y-0 px-3 py-2">
          <FormLabel className="font-normal">{schoolName}</FormLabel>
          <div className="flex flex-col items-end">
            <FormControl>
              <Input
                {...field}
                type="number"
                min={0}
                placeholder="0"
                className="w-24 text-right tabular-nums"
                aria-label={`${schoolName} copies`}
                value={field.value ?? ""}
                // Empty is null, not undefined: react-hook-form turns undefined back into the default.
                onChange={(event) =>
                  field.onChange(event.target.value === "" ? null : Number(event.target.value))
                }
              />
            </FormControl>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

type PrintableStudent = NonNullable<
  Awaited<ReturnType<typeof listPrintableStudents>>["data"]
>[number];

function SchoolStudentsRow({ index, hubId }: { index: number; hubId: string }) {
  const form = useFormContext<PrintRunFormValues>();
  const { schoolId, schoolName, activeStudents } = form.getValues(`schools.${index}`);
  const [students, setStudents] = useState<PrintableStudent[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const chooseStudents = toastOnError(async () => {
    setIsLoading(true);
    try {
      const response = await listPrintableStudents({ schoolId, hubId });
      if (!response.success || !response.data) {
        toast({ variant: "destructive", description: response.message });
        return;
      }
      setStudents(response.data);
      form.setValue(`schools.${index}.included`, true);
      form.setValue(
        `schools.${index}.studentIds`,
        response.data.map((s) => s.id),
      );
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className="space-y-2 px-3 py-2">
      <div className="flex items-center justify-between gap-4">
        <FormField
          control={form.control}
          name={`schools.${index}.included`}
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  disabled={activeStudents === 0}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <FormLabel className="font-normal">
                {schoolName}{" "}
                <span className="text-shamiri-text-grey">({activeStudents} active students)</span>
              </FormLabel>
            </FormItem>
          )}
        />
        {students === null && activeStudents > 0 && (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={chooseStudents}
            disabled={isLoading}
          >
            Choose students
          </Button>
        )}
      </div>
      {students && (
        <FormField
          control={form.control}
          name={`schools.${index}.studentIds`}
          render={({ field }) => (
            <ul className="ml-7 max-h-48 space-y-1 overflow-y-auto">
              {students.map((s) => (
                <li key={s.id}>
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(s.id) ?? true}
                        onCheckedChange={(checked) => {
                          const chosen = field.value ?? students.map((st) => st.id);
                          field.onChange(
                            checked === true
                              ? [...chosen, s.id]
                              : chosen.filter((id) => id !== s.id),
                          );
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {s.studentName ?? "Unnamed student"}
                      {s.admissionNumber && (
                        <span className="text-shamiri-text-grey"> · {s.admissionNumber}</span>
                      )}
                    </FormLabel>
                  </FormItem>
                </li>
              ))}
            </ul>
          )}
        />
      )}
    </div>
  );
}
