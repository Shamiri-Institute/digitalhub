"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { Dispatch } from "react";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { type BuilderAction, newItemId } from "#/lib/survey/builder";
import type { LockedQuestion } from "#/lib/survey/check-form";
import {
  type DisplayItem,
  ITEM_KIND_LABELS,
  isQuestion,
  type ItemKind,
  type SurveyForm,
  type SurveyItem,
} from "#/lib/survey/form";
import { isBlank, plainText } from "#/lib/survey/rich-text";
import { cn } from "#/lib/utils";
import { Field } from "./field";
import IconButton from "./icon-button";
import ItemSettings from "./item-settings";

const DISPLAY_KINDS: ItemKind[] = [
  "heading",
  "paragraph",
  "divider",
] satisfies DisplayItem["kind"][];
// Every other kind is a question, in the order the labels list them.
const QUESTION_KINDS = (Object.keys(ITEM_KIND_LABELS) as ItemKind[]).filter(
  (kind) => !DISPLAY_KINDS.includes(kind),
);

interface PageItemsProps {
  form: SurveyForm;
  pageIndex: number;
  /** The item open for editing, if it is on this page. */
  openItemId: string | undefined;
  dispatch: Dispatch<BuilderAction>;
  editable: boolean;
  messages: Map<string, string>;
  locked: LockedQuestion[];
  /** Items with a problem to fix before saving. */
  itemsWithIssues: Set<string>;
}

/** The current page: its title, its items in print order as cards, one open to edit in place. */
export default function PageItems({
  form,
  pageIndex,
  openItemId,
  dispatch,
  editable,
  messages,
  locked,
  itemsWithIssues,
}: PageItemsProps) {
  const page = form.pages[pageIndex];
  if (!page) {
    return null;
  }
  const number = pageIndex + 1;
  const lastPage = form.pages.length - 1;
  const questions = page.items.filter(isQuestion).length;
  const showPage = () => dispatch({ type: "select", selection: { page: pageIndex } });

  return (
    <section aria-label={`Page ${number}`} className="space-y-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <fieldset disabled={!editable} className="min-w-0 grow">
          <Field id={`page-${pageIndex}-title`} label="Page title">
            <Input
              id={`page-${pageIndex}-title`}
              value={page.title ?? ""}
              placeholder={`Page ${number}`}
              onChange={(e) =>
                dispatch({ type: "renamePage", page: pageIndex, title: e.target.value })
              }
            />
          </Field>
        </fieldset>
        <div className="flex items-center gap-3 pb-2">
          <span className="text-sm text-shamiri-text-grey">
            {page.items.length} {page.items.length === 1 ? "item" : "items"}, {questions}{" "}
            {questions === 1 ? "question" : "questions"}
          </span>
          {editable && (
            <div className="flex items-center">
              <IconButton
                label={`Move page ${number} earlier`}
                disabled={pageIndex === 0}
                onClick={() => dispatch({ type: "movePage", page: pageIndex, by: -1 })}
              >
                <ArrowLeft className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={`Move page ${number} later`}
                disabled={pageIndex === lastPage}
                onClick={() => dispatch({ type: "movePage", page: pageIndex, by: 1 })}
              >
                <ArrowRight className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={
                  page.items.length > 0
                    ? `Delete page ${number}: move or delete its items first`
                    : `Delete page ${number}`
                }
                disabled={page.items.length > 0}
                className="text-shamiri-light-red"
                onClick={() => dispatch({ type: "deletePage", page: pageIndex })}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          )}
        </div>
      </div>

      {page.items.length === 0 && (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">Nothing on this page yet</p>
          <p className="mt-1 text-sm text-shamiri-text-grey">
            {editable
              ? "Add questions, headings or text. The preview shows how the page will print."
              : "No items were added to this page."}
          </p>
        </div>
      )}

      <ol className="space-y-2">
        {page.items.map((item, itemIndex) => {
          const first = pageIndex === 0 && itemIndex === 0;
          const last = pageIndex === lastPage && itemIndex === page.items.length - 1;
          const hasIssue = itemsWithIssues.has(item.id);
          const moveControls = editable && (
            <>
              <IconButton
                label="Move up"
                disabled={first}
                onClick={() => dispatch({ type: "moveItem", itemId: item.id, by: -1 })}
              >
                <ArrowUp className="h-4 w-4" />
              </IconButton>
              <IconButton
                label="Move down"
                disabled={last}
                onClick={() => dispatch({ type: "moveItem", itemId: item.id, by: 1 })}
              >
                <ArrowDown className="h-4 w-4" />
              </IconButton>
            </>
          );

          if (item.id !== openItemId) {
            const summary = itemSummary(item);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-1 rounded-lg border bg-white pr-1 transition-colors hover:border-shamiri-new-blue/40",
                  hasIssue && "border-red-border bg-red-bg",
                )}
              >
                <button
                  type="button"
                  onClick={() => dispatch({ type: "select", selection: { item: item.id } })}
                  className="flex min-w-0 grow flex-col items-start gap-0.5 rounded-lg px-4 py-3 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue/60"
                >
                  <span className="flex w-full items-center gap-2 text-xs text-shamiri-text-grey">
                    {ITEM_KIND_LABELS[item.kind]}
                    {isQuestion(item) && <span className="font-mono">{item.key}</span>}
                    {isQuestion(item) && item.required && <span>· required</span>}
                    {hasIssue && (
                      <span className="ml-auto font-medium text-red-base">Needs a fix</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "w-full truncate text-sm",
                      !summary && "italic text-shamiri-text-grey",
                    )}
                  >
                    {summary || placeholder(item)}
                  </span>
                </button>
                {moveControls}
              </li>
            );
          }

          return (
            <li
              key={item.id}
              className="rounded-lg border-2 border-shamiri-new-blue bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
                <span className="mr-auto text-sm">
                  <span className="font-semibold">{ITEM_KIND_LABELS[item.kind]}</span>
                  <span className="text-shamiri-text-grey">
                    {isQuestion(item) ? " · question" : " · printed, not answered"}
                  </span>
                </span>
                {editable && (
                  <>
                    <Select
                      value={String(pageIndex)}
                      onValueChange={(value) =>
                        dispatch({ type: "moveItemToPage", itemId: item.id, page: Number(value) })
                      }
                    >
                      <SelectTrigger aria-label="Page" className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {form.pages.map((p, index) => (
                          // oxlint-disable-next-line react/no-array-index-key -- a page is identified by its position
                          <SelectItem key={index} value={String(index)}>
                            Page {index + 1}
                            {p.title ? ` · ${p.title}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {moveControls}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-shamiri-light-red hover:text-shamiri-light-red"
                      onClick={() => dispatch({ type: "deleteItem", itemId: item.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
                <IconButton label="Close" onClick={showPage}>
                  <ChevronUp className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="p-4">
                <ItemSettings
                  item={item}
                  dispatch={dispatch}
                  editable={editable}
                  messages={messages}
                  locked={locked}
                />
              </div>
            </li>
          );
        })}
      </ol>

      {editable && (
        <AddItemMenu
          pageNumber={number}
          onAdd={(kind) => dispatch({ type: "addItem", page: pageIndex, kind, id: newItemId() })}
        />
      )}
    </section>
  );
}

function AddItemMenu({
  pageNumber,
  onAdd,
}: {
  pageNumber: number;
  onAdd: (kind: ItemKind) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`Add item to page ${pageNumber}`}
          className="w-full gap-2 border-dashed text-shamiri-new-blue hover:text-shamiri-new-blue"
        >
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Questions</DropdownMenuLabel>
        {QUESTION_KINDS.map((kind) => (
          <DropdownMenuItem key={kind} onClick={() => onAdd(kind)}>
            {ITEM_KIND_LABELS[kind]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Printed only</DropdownMenuLabel>
        {DISPLAY_KINDS.map((kind) => (
          <DropdownMenuItem key={kind} onClick={() => onAdd(kind)}>
            {ITEM_KIND_LABELS[kind]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** What a closed card shows for an item: its prompt or text. */
function itemSummary(item: SurveyItem) {
  const text = isQuestion(item) ? item.prompt : item.kind === "divider" ? "" : item.text;
  // Text that reads as nothing shows the placeholder, as the preview shows its stand-in.
  return isBlank(text) ? "" : plainText(text);
}

function placeholder(item: SurveyItem) {
  if (item.kind === "divider") return "A line across the page";
  return isQuestion(item) ? "No prompt yet" : "No text yet";
}
