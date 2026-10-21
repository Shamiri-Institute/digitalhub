"use client";

import { AlignCenter, AlignLeft, Lock } from "lucide-react";
import { type Dispatch, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import type { BuilderAction } from "#/lib/survey/builder";
import { issueKey, type LockedQuestion, publishedQuestion } from "#/lib/survey/check-form";
import { isQuestion, type QuestionItem, type SurveyItem } from "#/lib/survey/form";
import { cn } from "#/lib/utils";
import BoldButton, { boldOnShortcut } from "./bold-button";
import EntryListEditor from "./entry-list-editor";
import { Field } from "./field";

const BOLD_HINT =
  "Select words and click B or press Ctrl+B (Cmd+B on Apple devices), or type **like this**, to print them bold. To print ** itself, type \\*\\*.";

interface ItemSettingsProps {
  item: SurveyItem;
  dispatch: Dispatch<BuilderAction>;
  editable: boolean;
  messages: Map<string, string>;
  locked: LockedQuestion[];
}

/** An open item card's body: every setting of its kind. */
export default function ItemSettings({
  item,
  dispatch,
  editable,
  messages,
  locked,
}: ItemSettingsProps) {
  const replace = (next: SurveyItem) => dispatch({ type: "replaceItem", item: next });
  const message = (field: string) => messages.get(issueKey(item.id, field));
  const fieldId = (field: string) => `${item.id}-${field}`;

  return (
    // A disabled fieldset turns every control below read-only for a published version.
    <fieldset disabled={!editable} className="space-y-5">
      {item.kind === "divider" && (
        <p className="text-sm text-muted-foreground">A line across the page. It has no settings.</p>
      )}
      {(item.kind === "heading" || item.kind === "paragraph") && (
        <>
          <Field
            id={fieldId("text")}
            label="Text"
            message={message("text")}
            description={editable ? BOLD_HINT : undefined}
            action={editable && <BoldButton fieldId={fieldId("text")} />}
          >
            <Textarea
              id={fieldId("text")}
              rows={item.kind === "heading" ? 2 : 5}
              value={item.text}
              onChange={(e) => replace({ ...item, text: e.target.value })}
              onKeyDown={boldOnShortcut}
            />
          </Field>
          <div className="flex items-center gap-3">
            <Label id={fieldId("align")}>Align</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              aria-labelledby={fieldId("align")}
              value={item.align ?? "left"}
              // Left is the default, so it is stored as no value; an empty value is a click on the
              // pressed option, which keeps it.
              onValueChange={(value) =>
                value && replace({ ...item, align: value === "center" ? "center" : undefined })
              }
            >
              <ToggleGroupItem value="left" aria-label="Align left">
                <AlignLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="Align centre">
                <AlignCenter className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </>
      )}
      {isQuestion(item) && (
        <QuestionSettings
          question={item}
          replace={replace}
          message={message}
          fieldId={fieldId}
          messages={messages}
          editable={editable}
          locked={locked}
        />
      )}
    </fieldset>
  );
}

interface QuestionSettingsProps {
  question: QuestionItem;
  replace: (item: SurveyItem) => void;
  message: (field: string) => string | undefined;
  fieldId: (field: string) => string;
  messages: Map<string, string>;
  editable: boolean;
  locked: LockedQuestion[];
}

function QuestionSettings({
  question,
  replace,
  message,
  fieldId,
  messages,
  editable,
  locked,
}: QuestionSettingsProps) {
  const lockedBy = locked.find((q) => q.id === question.id);
  // The published question asked under this key, whose codes stay fixed; another kind is an error
  // shown on the key instead.
  const published = publishedQuestion(locked, question.key);
  const review = question.review ?? {};
  // Open from the start when the question overrides the survey's review, and always when
  // read-only, since a disabled fieldset disables the toggle too. A problem in it keeps it open,
  // so a message from Save is never hidden in a closed section.
  const [reviewOpen, setReviewOpen] = useState(!editable || question.review !== undefined);
  const reviewOpenNow = reviewOpen || Boolean(message("review.confidenceThreshold"));
  const setReview = (change: Partial<NonNullable<QuestionItem["review"]>>) => {
    const next = { ...review, ...change };
    const empty = next.confidenceThreshold === undefined && !next.verifyAlways;
    replace({ ...question, review: empty ? undefined : next });
  };

  return (
    <>
      <Field
        id={fieldId("prompt")}
        label="Prompt"
        message={message("prompt")}
        description={editable ? BOLD_HINT : undefined}
        action={editable && <BoldButton fieldId={fieldId("prompt")} />}
      >
        <Textarea
          id={fieldId("prompt")}
          rows={2}
          value={question.prompt}
          onChange={(e) => replace({ ...question, prompt: e.target.value })}
          onKeyDown={boldOnShortcut}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          id={fieldId("key")}
          label="Key"
          message={message("key")}
          description={
            lockedBy
              ? `Published in v${lockedBy.versionNumber}, so it can't change`
              : "The export column; answers line up across versions by key"
          }
        >
          <div className="relative">
            <Input
              id={fieldId("key")}
              aria-invalid={Boolean(message("key"))}
              aria-describedby={message("key") ? `${fieldId("key")}-message` : undefined}
              value={question.key}
              disabled={Boolean(lockedBy)}
              onChange={(e) => replace({ ...question, key: e.target.value })}
              className={cn(
                "font-mono",
                message("key") && "border-destructive",
                lockedBy && "pr-8",
              )}
            />
            {lockedBy && (
              <Lock className="absolute right-2.5 top-2.5 h-4 w-4 text-shamiri-text-grey" />
            )}
          </div>
        </Field>
        <Field
          id={fieldId("helpText")}
          label="Help text"
          message={message("helpText")}
          action={editable && <BoldButton fieldId={fieldId("helpText")} />}
        >
          <Input
            id={fieldId("helpText")}
            value={question.helpText ?? ""}
            onChange={(e) => replace({ ...question, helpText: e.target.value || undefined })}
            onKeyDown={boldOnShortcut}
          />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={fieldId("required")}
          checked={question.required}
          onCheckedChange={(checked) => replace({ ...question, required: checked === true })}
        />
        <Label htmlFor={fieldId("required")}>Required</Label>
      </div>

      <KindSettings
        published={published?.kind === question.kind ? published : undefined}
        question={question}
        replace={replace}
        message={message}
        fieldId={fieldId}
        messages={messages}
        editable={editable}
      />

      <Accordion
        type="single"
        collapsible
        value={reviewOpenNow ? "review" : ""}
        onValueChange={(value) => setReviewOpen(value === "review")}
        className="rounded-lg border bg-muted/40 px-4"
      >
        <AccordionItem value="review">
          <AccordionTrigger className="gap-2 py-3 hover:no-underline">
            <span className="font-semibold">Scan review</span>
            <span className="font-normal text-shamiri-text-grey">{reviewSummary(review)}</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p className="text-xs text-muted-foreground">
              Overrides how this question&apos;s scanned answers are checked.
            </p>
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
              <Field
                id={fieldId("review.confidenceThreshold")}
                label="Confidence threshold"
                message={message("review.confidenceThreshold")}
                description="From 0 to 1; blank uses the survey's default"
              >
                <Input
                  id={fieldId("review.confidenceThreshold")}
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  value={review.confidenceThreshold ?? ""}
                  onChange={(e) =>
                    setReview({ confidenceThreshold: optionalNumber(e.target.value) })
                  }
                />
              </Field>
              <div className="flex items-center gap-2 pb-6">
                <Checkbox
                  id={fieldId("review.verifyAlways")}
                  checked={review.verifyAlways ?? false}
                  onCheckedChange={(checked) =>
                    setReview({ verifyAlways: checked === true || undefined })
                  }
                />
                <Label htmlFor={fieldId("review.verifyAlways")}>Always verify</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}

function KindSettings({
  question,
  replace,
  message,
  fieldId,
  messages,
  editable,
  published,
}: Omit<QuestionSettingsProps, "locked"> & { published: LockedQuestion | undefined }) {
  const publishedIn = published && `v${published.versionNumber}`;
  switch (question.kind) {
    case "single_choice":
    case "multiple_choice":
      return (
        <EntryListEditor
          itemId={question.id}
          noun="Option"
          field="options"
          codeName="code"
          entries={question.options}
          onChange={(options) => replace({ ...question, options })}
          messages={messages}
          editable={editable}
          publishedCount={published?.codes.length ?? 0}
          publishedIn={publishedIn}
        />
      );
    case "grid":
      return (
        <>
          <EntryListEditor
            itemId={question.id}
            noun="Option"
            field="options"
            codeName="code"
            entries={question.options}
            onChange={(options) => replace({ ...question, options })}
            messages={messages}
            editable={editable}
            publishedCount={published?.codes.length ?? 0}
            publishedIn={publishedIn}
          />
          <EntryListEditor
            itemId={question.id}
            noun="Row"
            field="rows"
            codeName="key"
            entries={question.rows.map((row) => ({ code: row.key, label: row.label }))}
            onChange={(rows) =>
              replace({
                ...question,
                rows: rows.map((row) => ({ key: row.code, label: row.label })),
              })
            }
            messages={messages}
            editable={editable}
            publishedCount={published?.rowKeys.length ?? 0}
            publishedIn={publishedIn}
          />
        </>
      );
    case "number":
      return (
        <div className="grid grid-cols-3 gap-4">
          <Field id={fieldId("digits")} label="Digits" message={message("digits")}>
            <Input
              id={fieldId("digits")}
              type="number"
              min={1}
              max={12}
              value={Number.isNaN(question.digits) ? "" : question.digits}
              onChange={(e) => replace({ ...question, digits: e.target.valueAsNumber })}
            />
          </Field>
          <Field id={fieldId("min")} label="Minimum" message={message("min")}>
            <Input
              id={fieldId("min")}
              type="number"
              value={question.min ?? ""}
              onChange={(e) => replace({ ...question, min: optionalNumber(e.target.value) })}
            />
          </Field>
          <Field id={fieldId("max")} label="Maximum" message={message("max")}>
            <Input
              id={fieldId("max")}
              type="number"
              value={question.max ?? ""}
              onChange={(e) => replace({ ...question, max: optionalNumber(e.target.value) })}
            />
          </Field>
        </div>
      );
    case "text":
      return (
        <Field
          id={fieldId("lines")}
          label="Lines"
          message={message("lines")}
          description="Writing lines printed for the answer"
          className="max-w-40"
        >
          <Input
            id={fieldId("lines")}
            type="number"
            min={1}
            max={30}
            value={Number.isNaN(question.lines) ? "" : question.lines}
            onChange={(e) => replace({ ...question, lines: e.target.valueAsNumber })}
          />
        </Field>
      );
    case "date":
      return <p className="text-sm text-muted-foreground">Printed as day, month and year boxes.</p>;
    case "signature":
      return <p className="text-sm text-muted-foreground">Printed as a box to sign in.</p>;
  }
}

/** The scan review settings in a few words, for the closed section. */
function reviewSummary(review: NonNullable<QuestionItem["review"]>) {
  const parts = [
    review.confidenceThreshold !== undefined && `threshold ${review.confidenceThreshold}`,
    review.verifyAlways && "always verified",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "survey default";
}

/** A number input's value, or undefined when it is blank. */
function optionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}
