import { Plus } from "lucide-react";
import type { Dispatch } from "react";

import type { BuilderAction } from "#/lib/survey/builder";
import type { SurveyForm } from "#/lib/survey/form";
import { cn } from "#/lib/utils";

interface PageTabsProps {
  form: SurveyForm;
  current: number;
  showPage: (pageIndex: number) => void;
  dispatch: Dispatch<BuilderAction>;
  editable: boolean;
  itemsWithIssues: Set<string>;
  /** Numbers of the pages the print layout can't print as they are. */
  unprintablePages: Set<number>;
}

/** One tab per printed page, in order, with how many of its items need a fix and whether it prints. */
export default function PageTabs({
  form,
  current,
  showPage,
  dispatch,
  editable,
  itemsWithIssues,
  unprintablePages,
}: PageTabsProps) {
  return (
    <nav aria-label="Pages" className="-mb-px flex min-w-0 items-end overflow-x-auto">
      {form.pages.map((page, index) => {
        const issues = page.items.filter((item) => itemsWithIssues.has(item.id)).length;
        const selected = index === current;
        return (
          <button
            // oxlint-disable-next-line react/no-array-index-key -- a page is identified by its position
            key={index}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => showPage(index)}
            className={cn(
              "flex max-w-56 shrink-0 items-baseline gap-2 border-b-2 border-transparent px-4 pb-3 pt-2 text-left text-sm transition-colors hover:text-foreground focus-visible:-outline-offset-2",
              selected ? "border-primary text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="shrink-0 font-semibold">Page {index + 1}</span>
            {page.title && <span className="truncate">{page.title}</span>}
            {issues > 0 && (
              <span className="shrink-0 rounded-full bg-destructive-bg px-1.5 text-xs font-medium text-destructive">
                {issues} to fix
              </span>
            )}
            {unprintablePages.has(index + 1) && (
              <span className="shrink-0 rounded-full bg-destructive-bg px-1.5 text-xs font-medium text-destructive">
                Doesn&apos;t print
              </span>
            )}
          </button>
        );
      })}
      {editable && form.pages.length > 0 && (
        <button
          type="button"
          onClick={() => dispatch({ type: "addPage" })}
          className="flex shrink-0 items-center gap-1 rounded-md px-3 pb-3 pt-2 text-sm font-medium text-primary hover:underline"
        >
          <Plus className="h-4 w-4" />
          Add page
        </button>
      )}
    </nav>
  );
}
