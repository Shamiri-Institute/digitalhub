"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, Suspense, use, useRef, useState } from "react";
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
import {
  createPrintRun,
  listPrintableHubs,
  listPrintableStudents,
} from "#/lib/actions/survey/print-runs";
import { objectId } from "#/lib/crypto";
import { type PrintRunRequest, printRunRequestKey } from "#/lib/survey/print-run-request";
import type { PrintableHubs, PrintableStudents } from "#/lib/survey/print-run-queries";
import { copyCount, MAX_COPIES_PER_RUN } from "#/lib/survey/serial";
import type { ActionResponse } from "#/types/actions.types";
import { zodResolver } from "#/lib/zod-resolver";

export type PrintedVersion = { id: string; label: string; prefill: SurveyVersionPrefill };

type HubsRequest = Promise<ActionResponse<PrintableHubs>>;

/** What the dialog shows: the version, the hubs it loads on opening, and which opening it is. */
type PrintRequest = { version: PrintedVersion; hubsRequest: HubsRequest; opening: number };

const PrintCopiesContext = createContext<((version: PrintedVersion) => void) | null>(null);

/** Opens the print dialog of the PrintCopiesProvider around the caller; null outside one. */
export function usePrintCopies() {
  return use(PrintCopiesContext);
}

/**
 * Holds a table's print dialog beside the table, not in its rows. Opening it re-renders neither
 * the table nor its rows, which would send DataTable back to page 1, and a refresh that pages or
 * reorders the rows leaves it open on its version.
 */
export function PrintCopiesProvider({
  runsPath,
  children,
}: {
  /** Where a created run's page lives, as `${runsPath}/${printRunId}`. */
  runsPath: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  // Kept after closing, so the content stays through the close animation.
  const [printing, setPrinting] = useState<PrintRequest | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  // Every request confirmed on this page, by version, hub and request key, with its run id. A
  // create whose reply was lost may have made its run, so asking for that request again, even
  // after closing the dialog, must reuse the id.
  const runIdsByRequest = useRef(new Map<string, string>());

  const openFor = (version: PrintedVersion) => {
    // Never rejects: use() would throw a lost connection to the page's error boundary.
    const hubsRequest = listPrintableHubs().catch(() => ({
      success: false,
      message: "Sorry, could not load the hubs.",
    }));
    setPrinting((shown) => ({ version, hubsRequest, opening: (shown?.opening ?? 0) + 1 }));
    setIsOpen(true);
  };
  // A create in flight would finish behind a closed dialog, and the next request could make a
  // second run before its reply.
  const close = () => !isCreating && setIsOpen(false);
  const printRunIdFor = (requestKey: string) => {
    const known = runIdsByRequest.current.get(requestKey);
    if (known) return known;
    const printRunId = objectId("surveyprintrun");
    runIdsByRequest.current.set(requestKey, printRunId);
    return printRunId;
  };

  return (
    <PrintCopiesContext value={openFor}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent className="flex max-h-[90vh] flex-col lg:w-[40rem] lg:max-w-[calc(100vw-2rem)]">
          {printing && (
            <Suspense
              key={printing.opening}
              fallback={
                <PrintRunNotice
                  version={printing.version}
                  message="Loading hubs…"
                  onClose={close}
                />
              }
            >
              <PrintRunHubs
                version={printing.version}
                hubsRequest={printing.hubsRequest}
                runsPath={runsPath}
                onClose={close}
                printRunIdFor={printRunIdFor}
                isCreating={isCreating}
                onCreatingChange={setIsCreating}
              />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </PrintCopiesContext>
  );
}

type PrintRunFormProps = {
  version: PrintedVersion;
  runsPath: string;
  /** The run id for a request key, the same each time the key is asked for. */
  printRunIdFor: (requestKey: string) => string;
  isCreating: boolean;
  onCreatingChange: (isCreating: boolean) => void;
};

function PrintRunHubs({
  hubsRequest,
  onClose,
  ...formProps
}: PrintRunFormProps & { hubsRequest: HubsRequest; onClose: () => void }) {
  const response = use(hubsRequest);
  if (!response.success || !response.data) {
    return (
      <PrintRunNotice version={formProps.version} message={response.message} onClose={onClose} />
    );
  }
  if (response.data.length === 0) {
    return (
      <PrintRunNotice
        version={formProps.version}
        message="No active hubs to print for."
        onClose={onClose}
      />
    );
  }
  return <PrintRunForm {...formProps} hubs={response.data} onCancel={onClose} />;
}

function PrintRunNotice({
  version,
  message,
  onClose,
}: {
  version: PrintedVersion;
  message: string;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Print copies of {version.label}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
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
      excludedStudentIds: z.array(z.string()),
    }),
  ),
});

type PrintRunFormValues = z.infer<typeof PrintRunFormSchema>;
type SchoolRow = PrintRunFormValues["schools"][number];

function schoolRowsOf(printHub: PrintableHubs[number] | undefined): SchoolRow[] {
  return (printHub?.schools ?? []).map((hubSchool) => ({
    schoolId: hubSchool.id,
    schoolName: hubSchool.schoolName,
    activeStudents: hubSchool.activeStudents,
    copies: null,
    included: false,
    excludedStudentIds: [],
  }));
}

type PrintableStudent = PrintableStudents[number];

/** Each school's students, once "Choose students" has loaded them. */
type LoadedStudents = Partial<Record<string, PrintableStudent[]>>;

/**
 * A school's copies as the form knows them. A student count can be stale by the time the run is
 * created, so the confirm step words it as approximate.
 */
function copiesOf(schoolRow: SchoolRow, printsStudents: boolean, loadedStudents: LoadedStudents) {
  if (!printsStudents) return schoolRow.copies ?? 0;
  if (!schoolRow.included) return 0;
  const activeStudents = loadedStudents[schoolRow.schoolId]?.length ?? schoolRow.activeStudents;
  return activeStudents - schoolRow.excludedStudentIds.length;
}

type PendingRun = {
  printRunId: string;
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
  printRunIdFor,
  isCreating,
  onCreatingChange,
}: PrintRunFormProps & { hubs: PrintableHubs; onCancel: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingRun | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  // Here rather than in each school's row, which unmounts while the confirm step shows.
  const [loadedStudents, setLoadedStudents] = useState<LoadedStudents>({});
  const printsStudents = version.prefill === SurveyVersionPrefill.STUDENT;

  const [firstHub] = hubs;
  const form = useForm<PrintRunFormValues>({
    resolver: zodResolver(PrintRunFormSchema),
    defaultValues: { hubId: firstHub?.id ?? "", schools: schoolRowsOf(firstHub) },
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "schools" });
  const copiesOfRow = (schoolRow: SchoolRow) => copiesOf(schoolRow, printsStudents, loadedStudents);
  const total = form.watch("schools").reduce((sum, schoolRow) => sum + copiesOfRow(schoolRow), 0);

  const onContinue = (values: PrintRunFormValues) => {
    const chosen = values.schools.filter((schoolRow) => copiesOfRow(schoolRow) > 0);
    const chosenTotal = chosen.reduce((sum, schoolRow) => sum + copiesOfRow(schoolRow), 0);
    if (chosen.length === 0) {
      form.setError("root", { message: "Choose at least one copy to print" });
      return;
    }
    if (chosenTotal > MAX_COPIES_PER_RUN) {
      form.setError("root", { message: `A print run has at most ${MAX_COPIES_PER_RUN} copies` });
      return;
    }
    const request: PrintRunRequest = printsStudents
      ? {
          kind: "STUDENTS",
          schools: chosen.map((schoolRow) => ({
            schoolId: schoolRow.schoolId,
            excludedStudentIds: schoolRow.excludedStudentIds,
          })),
        }
      : {
          kind: "COUNTS",
          schools: chosen.map((schoolRow) => ({
            schoolId: schoolRow.schoolId,
            copies: schoolRow.copies ?? 0,
          })),
        };
    setPending({
      printRunId: printRunIdFor(
        JSON.stringify([version.id, values.hubId, printRunRequestKey(request)]),
      ),
      hubId: values.hubId,
      hubName: hubs.find((h) => h.id === values.hubId)?.hubName ?? "",
      request,
      lines: chosen.map((schoolRow) => ({
        schoolId: schoolRow.schoolId,
        schoolName: schoolRow.schoolName,
        copies: copiesOfRow(schoolRow),
      })),
      total: chosenTotal,
    });
    setIsConfirming(true);
  };

  const onCreate = toastOnError(async () => {
    if (!pending) return;
    onCreatingChange(true);
    try {
      const response = await createPrintRun({
        printRunId: pending.printRunId,
        versionId: version.id,
        hubId: pending.hubId,
        request: pending.request,
      });
      if (!response.success) {
        toast({ variant: "destructive", description: response.message });
        return;
      }
      toast({ description: response.message });
      router.push(`${runsPath}/${pending.printRunId}`);
    } finally {
      onCreatingChange(false);
    }
  });

  if (pending && isConfirming) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Create the print run?</DialogTitle>
          <DialogDescription>
            {printsStudents
              ? `Print about ${copyCount(pending.total)} of ${version.label} for ${pending.hubName}, one for each chosen student still active when the run is created. Serials are assigned then.`
              : `Print ${copyCount(pending.total)} of ${version.label} for ${pending.hubName}. Serials are assigned when the run is created.`}
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y overflow-y-auto rounded-md border text-sm">
          {pending.lines.map((line) => (
            <li key={line.schoolId} className="flex justify-between gap-4 px-3 py-2">
              <span>{line.schoolName}</span>
              <span className="tabular-nums">
                {printsStudents && "about "}
                {copyCount(line.copies)}
              </span>
            </li>
          ))}
        </ul>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setIsConfirming(false)}
            disabled={isCreating}
          >
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
                  onValueChange={(chosenHubId) => {
                    field.onChange(chosenHubId);
                    replace(schoolRowsOf(hubs.find((h) => h.id === chosenHubId)));
                    setLoadedStudents({});
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
              <SchoolStudentsRow
                key={field.id}
                index={index}
                printHubId={form.getValues("hubId")}
                students={loadedStudents[field.schoolId]}
                onStudentsLoaded={(students) =>
                  setLoadedStudents((loaded) => ({ ...loaded, [field.schoolId]: students }))
                }
              />
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

function SchoolStudentsRow({
  index,
  printHubId,
  students,
  onStudentsLoaded,
}: {
  index: number;
  printHubId: string;
  students: PrintableStudent[] | undefined;
  onStudentsLoaded: (students: PrintableStudent[]) => void;
}) {
  const form = useFormContext<PrintRunFormValues>();
  const { schoolId, schoolName, activeStudents } = form.getValues(`schools.${index}`);
  const [isLoading, setIsLoading] = useState(false);

  const chooseStudents = toastOnError(async () => {
    setIsLoading(true);
    try {
      const response = await listPrintableStudents({ schoolId, hubId: printHubId });
      // The hub was switched while loading: this row index is now another hub's school.
      if (form.getValues("hubId") !== printHubId) return;
      if (!response.success || !response.data) {
        toast({ variant: "destructive", description: response.message });
        return;
      }
      onStudentsLoaded(response.data);
      form.setValue(`schools.${index}.included`, true);
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
        {students === undefined && activeStudents > 0 && (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            aria-label={`Choose students at ${schoolName}`}
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
          name={`schools.${index}.excludedStudentIds`}
          render={({ field }) => (
            <ul className="ml-7 max-h-48 space-y-1 overflow-y-auto">
              {students.map((s) => (
                <li key={s.id}>
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={!field.value.includes(s.id)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked === true
                              ? field.value.filter((id) => id !== s.id)
                              : [...field.value, s.id],
                          )
                        }
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
