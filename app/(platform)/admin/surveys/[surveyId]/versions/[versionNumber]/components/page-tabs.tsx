import { Plus } from "lucide-react";
import type { Dispatch } from "react";

import type { BuilderAction } from "#/lib/survey/builder";
import type { SurveyForm } from "#/lib/survey/form";
import { cn } from "#/lib/utils";

interface PageTabsProps {
  form: SurveyForm;
  current: number;
  dispatch: Dispatch<BuilderAction>;
  editable: boolean;
  itemsWithIssues: Set<string>;
}

/** One tab per printed page, in order, with how many of its items need a fix. */
export default function PageTabs({
  form,
  current,
  dispatch,
  editable,
  itemsWithIssues,
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
            onClick={() => dispatch({ type: "select", selection: { page: index } })}
            className={cn(
              "flex max-w-56 shrink-0 items-baseline gap-2 border-b-2 border-transparent px-4 pb-3 pt-2 text-left text-sm transition-colors hover:text-shamiri-black focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shamiri-new-blue/60",
              selected ? "border-shamiri-new-blue text-shamiri-black" : "text-shamiri-text-grey",
            )}
          >
            <span className="font-semibold">Page {index + 1}</span>
            {page.title && <span className="truncate">{page.title}</span>}
            {issues > 0 && (
              <span className="shrink-0 rounded-full bg-red-bg px-1.5 text-xs font-medium text-red-base">
                {issues} to fix
              </span>
            )}
          </button>
        );
      })}
      {editable && form.pages.length > 0 && (
        <button
          type="button"
          onClick={() => dispatch({ type: "addPage" })}
          className="flex shrink-0 items-center gap-1 rounded-md px-3 pb-3 pt-2 text-sm font-medium text-shamiri-new-blue hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue/60"
        >
          <Plus className="h-4 w-4" />
          Add page
        </button>
      )}
    </nav>
  );
}
