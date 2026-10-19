"use client";

import { Check, RefreshCw } from "lucide-react";
import { type Dispatch, useReducer, useState } from "react";

import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { toast } from "#/components/ui/use-toast";
import { saveDraftForm } from "#/lib/actions/survey";
import {
  type BuilderAction,
  builderReducer,
  findItem,
  hasUnsavedChanges,
  initBuilder,
  pageOf,
} from "#/lib/survey/builder";
import { checkForm, indexIssues } from "#/lib/survey/check-form";
import { isQuestion, type SurveyPage } from "#/lib/survey/form";
import type { BuilderData } from "../../../../queries";
import BuilderOutline from "./builder-outline";
import { Field } from "./field";
import ItemSettings from "./item-settings";
import { useLeaveGuard } from "./use-leave-guard";

interface SurveyBuilderProps {
  version: BuilderData["version"];
  locked: BuilderData["locked"];
  editable: boolean;
}

/** Edits a draft's form and saves it whole; shows a published version the same way, read-only. */
export default function SurveyBuilder({ version, locked, editable }: SurveyBuilderProps) {
  const [state, dispatch] = useReducer(builderReducer, version, initBuilder);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);

  const unsaved = editable && hasUnsavedChanges(state);
  useLeaveGuard(unsaved);

  // Checked on every render so a message clears as soon as the field is fixed.
  const check = checkForm(state.form, locked);
  const issues = state.showIssues ? check.issues : [];
  const messages = indexIssues(issues);
  const itemsWithIssues = new Set(issues.flatMap((issue) => issue.itemId ?? []));

  const handleSave = async () => {
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
      toast({ variant: "destructive", description: "Sorry, could not save the draft." });
    } finally {
      setSaving(false);
    }
  };

  const selection = state.selection;
  const selectedItem =
    selection && "item" in selection ? findItem(state.form, selection.item) : undefined;
  const selectedPage =
    selection && "page" in selection ? state.form.pages[selection.page] : undefined;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-4 border-b bg-white/95 px-1 py-3 backdrop-blur-sm">
        <p className="text-sm text-shamiri-text-grey" aria-live="polite">
          {!editable
            ? "Published versions can't be edited. Start a new draft from the survey page."
            : unsaved
              ? "Unsaved changes"
              : "All changes saved"}
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
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <BuilderOutline
            form={state.form}
            selection={state.selection}
            dispatch={dispatch}
            editable={editable}
            itemsWithIssues={itemsWithIssues}
          />
        </div>
        <Card className="h-fit p-6 lg:sticky lg:top-20 lg:col-span-3">
          {selectedItem ? (
            <ItemSettings
              // A fresh pane per item, so its field ids and inputs never carry over.
              key={selectedItem.id}
              item={selectedItem}
              form={state.form}
              pageIndex={pageOf(state.form, selectedItem.id)}
              dispatch={dispatch}
              editable={editable}
              messages={messages}
              locked={locked}
            />
          ) : selectedPage && selection && "page" in selection ? (
            <PageSettings
              page={selectedPage}
              index={selection.page}
              dispatch={dispatch}
              editable={editable}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm font-medium">Nothing selected</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a page or an item on the left to see its settings.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function PageSettings({
  page,
  index,
  dispatch,
  editable,
}: {
  page: SurveyPage;
  index: number;
  dispatch: Dispatch<BuilderAction>;
  editable: boolean;
}) {
  const questions = page.items.filter(isQuestion).length;
  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-lg font-semibold">Page {index + 1}</h2>
        <p className="text-sm text-shamiri-text-grey">
          {page.items.length} {page.items.length === 1 ? "item" : "items"}, {questions}{" "}
          {questions === 1 ? "question" : "questions"}. Each page prints as one sheet.
        </p>
      </div>
      <fieldset disabled={!editable}>
        <Field id={`page-${index}-title`} label="Page title">
          <Input
            id={`page-${index}-title`}
            value={page.title ?? ""}
            onChange={(e) => dispatch({ type: "renamePage", page: index, title: e.target.value })}
          />
        </Field>
      </fieldset>
    </div>
  );
}
