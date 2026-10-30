"use client";

import { Check, Plus, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type Dispatch, useReducer, useState } from "react";

import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { SURVEY_VERSION_STATUS_LABELS } from "#/db/enums";
import { toast } from "#/components/ui/use-toast";
import { saveDraftForm } from "#/lib/actions/survey";
import {
  type BuilderAction,
  builderReducer,
  currentPage,
  hasUnsavedChanges,
  initBuilder,
} from "#/lib/survey/builder";
import { checkForm, indexIssues } from "#/lib/survey/check-form";
import { describeProblem, layOutForm, sampleCopy } from "#/lib/survey/layout";
import type { BuilderData } from "../../../../queries";
import PageItems from "./page-items";
import PageProof from "./page-proof";
import PageTabs from "./page-tabs";
import PublishDialog from "./publish-dialog";
import SamplePdfButton from "./sample-pdf-button";
import { useLeaveGuard } from "./use-leave-guard";

interface SurveyBuilderProps {
  surveyCode: string;
  version: BuilderData["version"];
  locked: BuilderData["locked"];
  editable: boolean;
}

/**
 * Edits a draft's form one page at a time, beside that page's print preview, and saves it whole.
 * Shows a published version the same way, read-only.
 */
export default function SurveyBuilder({
  surveyCode,
  version,
  locked,
  editable,
}: SurveyBuilderProps) {
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(
    builderReducer,
    {
      ...version,
      publishedKeys: locked.map((q) => q.key),
      pageNumber: searchParams.get("page"),
    },
    initBuilder,
  );
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);

  const pageIndex = currentPage(state.form, state.selection);
  // Any change that moves to another page, not only picking a tab, also writes that page to the
  // URL, so a reload or a shared link opens the page on screen.
  const dispatchAndShowPage: Dispatch<BuilderAction> = (action) => {
    const next = builderReducer(state, action);
    dispatch(action);
    const nextPageIndex = currentPage(next.form, next.selection);
    if (nextPageIndex !== pageIndex) {
      const url = new URL(window.location.href);
      url.searchParams.set("page", String(nextPageIndex + 1));
      window.history.replaceState(null, "", url);
    }
  };
  const showPage = (pickedPageIndex: number) =>
    dispatchAndShowPage({ type: "select", selection: { page: pickedPageIndex } });

  const unsaved = editable && hasUnsavedChanges(state);
  const allowLeave = useLeaveGuard(unsaved);

  // Once Save has shown the problems, they are checked again as the form changes, so a message
  // clears as soon as its field is fixed. Before that, typing runs no checks.
  const issues = state.showIssues ? checkForm(state.form, locked).issues : [];
  const messages = indexIssues(issues);
  const itemsWithIssues = new Set(issues.flatMap((issue) => issue.itemId ?? []));

  const handleSave = async () => {
    const check = checkForm(state.form, locked);
    if (!check.success) {
      dispatchAndShowPage({
        type: "showIssues",
        itemId: check.issues.find((i) => i.itemId)?.itemId,
      });
      toast({
        variant: "destructive",
        description: check.issues.find((i) => !i.itemId)?.message ?? "Fix the marked fields first",
      });
      return;
    }
    const sent = state.form;
    setSaving(true);
    try {
      const response = await saveDraftForm({
        versionId: version.id,
        revision: state.revision,
        form: sent,
        unconfirmedForm: state.unconfirmed ?? undefined,
      });
      const result = response.data;
      if (response.success && result?.outcome === "saved") {
        dispatchAndShowPage({ type: "saved", revision: result.revision, form: sent });
        toast({ description: "Saved" });
        return;
      }
      if (result?.outcome === "stale") {
        setStale(true);
      }
      toast({ variant: "destructive", description: response.message });
    } catch {
      // The reply was lost, so the save may have been stored all the same.
      dispatchAndShowPage({ type: "saveUnconfirmed", form: sent });
      toast({ variant: "destructive", description: "Sorry, could not save the draft." });
    } finally {
      setSaving(false);
    }
  };

  const page = state.form.pages[pageIndex];
  // A published version shows the layout it froze. A draft is laid out again on every change, as
  // blank copies: the prefill only fills the header, so the fit is the same as when published.
  const proof = version.layout
    ? { layout: version.layout, problems: [] }
    : layOutForm(state.form, "NONE");
  const proofPage = proof.layout.pages[pageIndex];
  const unprintablePages = new Set(proof.problems.map((problem) => problem.page));
  const pageProblems = proof.problems
    .filter((problem) => problem.page === pageIndex + 1)
    .map((problem) => describeProblem(problem, state.form));
  const openItemId =
    state.selection && "item" in state.selection ? state.selection.item : undefined;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-1 flex flex-col-reverse gap-2 border-b bg-white/95 px-1 pt-2 backdrop-blur-sm sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <PageTabs
          form={state.form}
          current={pageIndex}
          showPage={showPage}
          dispatch={dispatchAndShowPage}
          editable={editable}
          itemsWithIssues={itemsWithIssues}
          unprintablePages={unprintablePages}
        />
        <div className="flex shrink-0 items-center justify-end gap-4 sm:pb-2">
          <p className="text-sm text-shamiri-text-grey" aria-live="polite">
            {!editable
              ? `${SURVEY_VERSION_STATUS_LABELS[version.status]} versions can't be edited. Start a new draft from the survey page.`
              : unsaved
                ? "Unsaved changes"
                : "All changes saved"}
            {itemsWithIssues.size > 0 && (
              <span className="font-medium text-red-base"> · {itemsWithIssues.size} to fix</span>
            )}
          </p>
          {editable && (
            <Button
              type="button"
              variant="brand"
              className="gap-2"
              disabled={!unsaved || saving || stale}
              loading={saving}
              onClick={() => void handleSave()}
            >
              {!unsaved && !saving && <Check className="h-4 w-4" />}
              Save
            </Button>
          )}
          <SamplePdfButton
            layout={proof.layout}
            fileName={`${surveyCode}-v${version.versionNumber}-sample.pdf`}
            disabled={proof.layout.pages.length === 0 || proof.problems.length > 0}
          />
          {editable && (
            <PublishDialog
              versionId={version.id}
              versionNumber={version.versionNumber}
              revision={state.revision}
              form={state.form}
              locked={locked}
              unsaved={unsaved}
            />
          )}
        </div>
      </div>

      {stale && (
        <Alert variant="destructive" className="flex items-center justify-between gap-4">
          <AlertDescription>
            This draft was changed elsewhere since you opened it. Reload to see the latest version;
            your changes here will be lost.
          </AlertDescription>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1"
            onClick={() => {
              allowLeave();
              window.location.reload();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        </Alert>
      )}

      {page ? (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 grow">
            <PageItems
              form={state.form}
              pageIndex={pageIndex}
              openItemId={openItemId}
              showPage={showPage}
              dispatch={dispatchAndShowPage}
              editable={editable}
              messages={messages}
              locked={locked}
              itemsWithIssues={itemsWithIssues}
            />
          </div>
          <div className="lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:w-128 lg:shrink-0 lg:overflow-y-auto">
            {proofPage && (
              <PageProof
                paper={proof.layout.paper}
                page={proofPage}
                copy={sampleCopy(proof.layout)}
                problems={pageProblems}
                openItemId={openItemId}
                itemsWithIssues={itemsWithIssues}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-md rounded-xl border border-dashed px-6 py-16 text-center">
          <p className="font-medium">This form has no pages yet</p>
          <p className="mt-1 text-sm text-shamiri-text-grey">
            {editable
              ? "Each page here prints as one A4 sheet. Add a page, then add questions to it."
              : "Nothing was added to this version."}
          </p>
          {editable && (
            <Button
              type="button"
              variant="brand"
              className="mt-6 gap-2"
              onClick={() => dispatchAndShowPage({ type: "addPage" })}
            >
              <Plus className="h-4 w-4" />
              Add page
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
