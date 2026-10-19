"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
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
import { type BuilderAction, newItemId, type Selection } from "#/lib/survey/builder";
import {
  type DisplayItem,
  ITEM_KIND_LABELS,
  isQuestion,
  type ItemKind,
  type SurveyForm,
  type SurveyItem,
} from "#/lib/survey/form";
import { cn } from "#/lib/utils";
import IconButton from "./icon-button";

const DISPLAY_KINDS: ItemKind[] = [
  "heading",
  "paragraph",
  "divider",
] satisfies DisplayItem["kind"][];
// Every other kind is a question, in the order the labels list them.
const QUESTION_KINDS = (Object.keys(ITEM_KIND_LABELS) as ItemKind[]).filter(
  (kind) => !DISPLAY_KINDS.includes(kind),
);

interface BuilderOutlineProps {
  form: SurveyForm;
  selection: Selection;
  dispatch: Dispatch<BuilderAction>;
  editable: boolean;
  /** Items with a problem to fix before saving. */
  itemsWithIssues: Set<string>;
}

/** The left pane: every page and its items in print order, with controls to arrange them. */
export default function BuilderOutline({
  form,
  selection,
  dispatch,
  editable,
  itemsWithIssues,
}: BuilderOutlineProps) {
  const lastPage = form.pages.length - 1;

  return (
    <nav aria-label="Pages and items" className="space-y-4">
      {form.pages.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm font-medium">This form has no pages yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {editable
              ? "Each page here prints as one sheet. Add a page, then add questions to it."
              : "Nothing was added to this version."}
          </p>
        </div>
      )}
      {form.pages.map((page, pageIndex) => {
        const number = pageIndex + 1;
        const pageSelected =
          selection !== null && "page" in selection && selection.page === pageIndex;
        return (
          <section
            // oxlint-disable-next-line react/no-array-index-key -- a page is identified by its position
            key={pageIndex}
            aria-label={`Page ${number}`}
            className="rounded-lg border bg-white"
          >
            <div
              className={cn(
                "flex items-center gap-1 rounded-t-lg border-b bg-muted/40 py-1 pl-1 pr-1",
                pageSelected && "bg-blue-bg",
              )}
            >
              <button
                type="button"
                aria-current={pageSelected ? "true" : undefined}
                onClick={() => dispatch({ type: "select", selection: { page: pageIndex } })}
                className="flex min-w-0 grow items-baseline gap-2 rounded-md px-2 py-1.5 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue/60"
              >
                <span className="shrink-0 text-sm font-semibold">Page {number}</span>
                <span className="truncate text-sm text-shamiri-text-grey">{page.title}</span>
              </button>
              {editable && (
                <>
                  <IconButton
                    label={`Move page ${number} up`}
                    disabled={pageIndex === 0}
                    onClick={() => dispatch({ type: "movePage", page: pageIndex, by: -1 })}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={`Move page ${number} down`}
                    disabled={pageIndex === lastPage}
                    onClick={() => dispatch({ type: "movePage", page: pageIndex, by: 1 })}
                  >
                    <ArrowDown className="h-4 w-4" />
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
                </>
              )}
            </div>

            <ol className="divide-y">
              {page.items.map((item, itemIndex) => {
                const selected =
                  selection !== null && "item" in selection && selection.item === item.id;
                const first = pageIndex === 0 && itemIndex === 0;
                const last = pageIndex === lastPage && itemIndex === page.items.length - 1;
                return (
                  <li
                    key={item.id}
                    className={cn("flex items-center gap-1 pr-1", selected && "bg-blue-bg")}
                  >
                    <button
                      type="button"
                      aria-current={selected ? "true" : undefined}
                      onClick={() => dispatch({ type: "select", selection: { item: item.id } })}
                      className={cn(
                        "flex min-w-0 grow flex-col items-start gap-0.5 border-l-2 border-transparent py-2 pl-3 pr-2 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shamiri-new-blue/60",
                        selected && "border-shamiri-new-blue",
                      )}
                    >
                      <span className="flex w-full items-center gap-2 text-xs text-shamiri-text-grey">
                        {ITEM_KIND_LABELS[item.kind]}
                        {isQuestion(item) && <span className="font-mono">{item.key}</span>}
                        {itemsWithIssues.has(item.id) && (
                          <span className="ml-auto font-medium text-shamiri-light-red">
                            Needs a fix
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "w-full truncate text-sm",
                          !itemSummary(item) && "italic text-shamiri-text-grey",
                        )}
                      >
                        {itemSummary(item) || placeholder(item)}
                      </span>
                    </button>
                    {editable && (
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
                    )}
                  </li>
                );
              })}
            </ol>

            {editable && (
              <div className={cn("p-2", page.items.length > 0 && "border-t")}>
                <AddItemMenu
                  pageNumber={number}
                  onAdd={(kind) =>
                    dispatch({ type: "addItem", page: pageIndex, kind, id: newItemId() })
                  }
                />
              </div>
            )}
          </section>
        );
      })}
      {editable && (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => dispatch({ type: "addPage" })}
        >
          <Plus className="h-4 w-4" />
          Add page
        </Button>
      )}
    </nav>
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
          variant="ghost"
          size="sm"
          aria-label={`Add item to page ${pageNumber}`}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
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

/** What the outline shows for an item: its prompt or text. */
function itemSummary(item: SurveyItem) {
  if (isQuestion(item)) return item.prompt;
  return item.kind === "divider" ? "" : item.text;
}

function placeholder(item: SurveyItem) {
  if (item.kind === "divider") return "A line across the page";
  return isQuestion(item) ? "No prompt yet" : "No text yet";
}
