"use client";

import { Check, Plus, RefreshCw } from "lucide-react";
import { useReducer, useState } from "react";

import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/use-toast";
import { saveDraftForm } from "#/lib/actions/survey";
import { builderReducer, currentPage, hasUnsavedChanges, initBuilder } from "#/lib/survey/builder";
import { checkForm, indexIssues } from "#/lib/survey/check-form";
import type { BuilderData } from "../../../../queries";
import PageItems from "./page-items";
import PageProof from "./page-proof";
import PageTabs from "./page-tabs";
import { useLeaveGuard } from "./use-leave-guard";

interface SurveyBuilderProps {
  version: BuilderData["version"];
  locked: BuilderData["locked"];
  editable: boolean;
}

/**
 * Edits a draft's form one page at a time, beside that page's print preview, and saves it whole.
 * Shows a published version the same way, read-only.
 */
export default function SurveyBuilder({ version, locked, editable }: SurveyBuilderProps) {
  const [state, dispatch] = useReducer(
    builderReducer,
    { ...version, publishedKeys: locked.map((q) => q.key) },
    initBuilder,
  );
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);

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
      dispatch({ type: "showIssues", itemId: check.issues.find((i) => i.itemId)?.itemId });
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
        dispatch({ type: "saved", revision: result.revision, form: sent });
        toast({ description: "Saved" });
        return;
      }
      if (result?.outcome === "stale") {
        setStale(true);
      }
      toast({ variant: "destructive", description: response.message });
    } catch {
      // The reply was lost, so the save may have been stored all the same.
      dispatch({ type: "saveUnconfirmed", form: sent });
      toast({ variant: "destructive", description: "Sorry, could not save the draft." });
    } finally {
      setSaving(false);
    }
  };

  const pageIndex = currentPage(state.form, state.selection);
  const page = state.form.pages[pageIndex];
  const openItemId =
    state.selection && "item" in state.selection ? state.selection.item : undefined;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-1 flex flex-col-reverse gap-2 border-b bg-white/95 px-1 pt-2 backdrop-blur-sm sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <PageTabs
          form={state.form}
          current={pageIndex}
          dispatch={dispatch}
          editable={editable}
          itemsWithIssues={itemsWithIssues}
        />
        <div className="flex shrink-0 items-center justify-end gap-4 sm:pb-2">
          <p className="text-sm text-shamiri-text-grey" aria-live="polite">
            {!editable
              ? "Published versions can't be edited. Start a new draft from the survey page."
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
              dispatch={dispatch}
              editable={editable}
              messages={messages}
              locked={locked}
              itemsWithIssues={itemsWithIssues}
            />
          </div>
          <div className="lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:w-128 lg:shrink-0 lg:overflow-y-auto">
            <PageProof
              page={page}
              index={pageIndex}
              pageCount={state.form.pages.length}
              openItemId={openItemId}
              itemsWithIssues={itemsWithIssues}
            />
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
              onClick={() => dispatch({ type: "addPage" })}
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
