import { Figtree } from "next/font/google";

import { isBlank, parseBold, type TextRun } from "#/lib/survey/rich-text";
import { cn } from "#/lib/utils";
import { isQuestion, type SurveyItem, type SurveyPage } from "#/lib/survey/form";

/**
 * The sheet's own copy of the app font, as Figtree's variable font: one file holding every weight
 * printed text uses. The app loads Figtree at 600 only, which would draw normal, semibold and
 * **bold** text all the same.
 */
const printFont = Figtree({ subsets: ["latin"] });

interface PageProofProps {
  page: SurveyPage;
  index: number;
  pageCount: number;
  /** The item open for editing, outlined on the sheet. */
  openItemId: string | undefined;
  itemsWithIssues: Set<string>;
}

/**
 * One page drawn as it prints. The sheet is laid out at A4's size on screen (794 by 1123 pixels at
 * 96 per inch) with print-sized type and spacing in millimetres, then zoomed down to fit the
 * column. `zoom`, unlike a transform, shrinks the layout too, so the fit shown is the full-size
 * layout's fit. The print layout engine decides the real fit at publish, so this one is approximate.
 *
 * Items that run past the sheet land on the grey desk below it. The warning under them sits
 * beneath the sheet in the stacking order, so the sheet hides it until the items push it off the
 * paper: no measuring needed.
 */
export default function PageProof({
  page,
  index,
  pageCount,
  openItemId,
  itemsWithIssues,
}: PageProofProps) {
  return (
    <figure className="space-y-3">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold">Print preview</span>
        <span className="text-xs text-shamiri-text-grey">A4 · approximate fit</span>
      </figcaption>
      <div aria-hidden="true" className="overflow-x-auto rounded-xl bg-muted p-4">
        <div
          className={cn(
            "relative isolate mx-auto w-198 font-normal text-shamiri-black [zoom:0.6]",
            printFont.className,
          )}
        >
          <div className="absolute inset-x-0 top-0 z-10 aspect-[210/297] bg-white shadow-lg">
            <span className="absolute left-8 top-8 size-5 bg-shamiri-black" />
            <span className="absolute bottom-8 left-8 size-5 bg-shamiri-black" />
            <span className="absolute bottom-8 right-8 size-5 bg-shamiri-black" />
            <span className="absolute right-8 top-8 grid size-18 place-items-center border-2 border-dashed border-shamiri-text-grey text-xs font-medium text-shamiri-text-grey">
              QR
            </span>
          </div>
          {/* Text runs between the corner markers' outer edges, the same small margin on both
              sides; the header stops short of the QR code. */}
          <div className="flex aspect-[210/297] flex-col px-8 pb-16 pt-16">
            <header className="relative z-20 mb-8 mr-22 flex items-baseline gap-6 border-b border-shamiri-light-grey pb-3 text-xs tabular-nums text-shamiri-text-dark-grey">
              <span className="font-semibold text-shamiri-black">
                Page {index + 1} of {pageCount}
              </span>
              {page.title && <span className="truncate">{page.title}</span>}
              <span className="ml-auto shrink-0">Serial printed on each copy</span>
            </header>
            {page.items.length === 0 && (
              <p className="relative z-20 py-24 text-center text-sm text-shamiri-text-grey">
                Items you add appear here as they print.
              </p>
            )}
            <div className="flex flex-col gap-6">
              {page.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "relative z-20 -mx-3 rounded-md px-3 py-2",
                    // A heading sits closer to what it introduces than to what came before.
                    item.kind === "heading" && "-mb-3 mt-3",
                    // A divider is a thin rule, so it takes 12px each side instead of a full gap.
                    item.kind === "divider" && "-my-4 py-1",
                    // The last item ends where its box ends, so the note below starts there.
                    "last:mb-0",
                    itemsWithIssues.has(item.id) && "bg-red-bg ring-2 ring-red-base",
                    item.id === openItemId && "bg-blue-bg ring-4 ring-shamiri-new-blue",
                  )}
                >
                  <PrintedItem item={item} />
                </div>
              ))}
            </div>
            {/* No height of its own, outside the items' gaps, so the note starts where the items
                end. It is one line as tall as the sheet's bottom margin, so any of it showing
                below the sheet means the items run into that margin. */}
            <div className="relative z-0 h-0">
              <p className="h-16 truncate rounded-md bg-red-bg px-4 text-base font-medium leading-16 text-red-base">
                Doesn&apos;t fit on one A4 page; move items to another page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

function PrintedItem({ item }: { item: SurveyItem }) {
  if (!isQuestion(item)) {
    switch (item.kind) {
      case "heading":
        return (
          <Printed
            text={item.text}
            empty="Heading"
            className={cn(
              "text-xl font-bold leading-snug",
              item.align === "center" && "text-center",
            )}
          />
        );
      case "paragraph":
        return (
          <Printed
            text={item.text}
            empty="Paragraph"
            className={cn(
              "whitespace-pre-line text-sm leading-relaxed",
              item.align === "center" && "text-center",
            )}
          />
        );
      case "divider":
        return <hr className="border-shamiri-black" />;
    }
  }
  const help = parseBold(item.helpText ?? "");
  return (
    <div className="space-y-2.5">
      <div className="space-y-0.5">
        <Printed
          text={item.prompt}
          empty="Question"
          className="text-sm font-semibold leading-snug"
        />
        {!isBlank(help) && (
          <p className="text-xs text-shamiri-text-dark-grey">
            <RichText runs={help} />
          </p>
        )}
      </div>
      <Response item={item} />
    </div>
  );
}

/** Printed text, or a grey stand-in while it reads as nothing, markers alone included. */
function Printed({ text, empty, className }: { text: string; empty: string; className: string }) {
  const runs = parseBold(text);
  const blank = isBlank(runs);
  return (
    <p className={cn(className, blank && "font-normal italic text-shamiri-text-grey")}>
      {blank ? empty : <RichText runs={runs} />}
    </p>
  );
}

/** Text with its `**bold**` words in bold, as it prints, from its parsed runs. */
function RichText({ runs }: { runs: TextRun[] }) {
  return runs.map((run, i) =>
    run.bold ? (
      // oxlint-disable-next-line react/no-array-index-key -- runs are derived from the text and never reorder
      <strong key={i} className="font-bold">
        {run.text}
      </strong>
    ) : (
      run.text
    ),
  );
}

function Response({ item }: { item: Extract<SurveyItem, { key: string }> }) {
  switch (item.kind) {
    case "single_choice":
    case "multiple_choice":
      return (
        <div className="flex flex-wrap gap-x-8 gap-y-2.5">
          {item.options.map((option, i) => (
            // oxlint-disable-next-line react/no-array-index-key -- codes may repeat while being typed
            <span key={i} className="flex items-center gap-2 text-sm">
              <Mark round={item.kind === "single_choice"} />
              <RichText runs={parseBold(option.label)} />
            </span>
          ))}
        </div>
      );
    case "grid":
      return (
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th />
              {item.options.map((option, i) => (
                // oxlint-disable-next-line react/no-array-index-key -- codes may repeat while being typed
                <th key={i} className="w-20 pb-2 align-bottom text-xs font-medium leading-tight">
                  <RichText runs={parseBold(option.label)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.rows.map((row, r) => (
              // oxlint-disable-next-line react/no-array-index-key -- row keys may repeat while being typed
              <tr key={r} className="border-t border-shamiri-light-grey">
                <td className="py-2 pr-4 leading-snug">
                  <RichText runs={parseBold(row.label)} />
                </td>
                {item.options.map((_, c) => (
                  // oxlint-disable-next-line react/no-array-index-key -- codes may repeat while being typed
                  <td key={c} className="text-center align-middle">
                    <Mark round />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "number":
      return <Boxes count={within(item.digits, 12)} />;
    case "date":
      return (
        <div className="flex items-start gap-2 text-sm text-shamiri-text-grey">
          <Boxes count={2} hint="DD" />
          <span className="leading-8">/</span>
          <Boxes count={2} hint="MM" />
          <span className="leading-8">/</span>
          <Boxes count={4} hint="YYYY" />
        </div>
      );
    case "text":
      return (
        <div>
          {Array.from({ length: within(item.lines, 30) }, (_, line) => (
            <div key={line} className="h-9 border-b border-shamiri-text-grey" />
          ))}
        </div>
      );
    case "signature":
      return <div className="h-20 w-1/2 rounded-sm border border-shamiri-black" />;
  }
}

/** A count typed into a settings field, kept between 1 and `max` while it is still being fixed. */
function within(count: number, max: number) {
  return Number.isInteger(count) ? Math.min(Math.max(count, 1), max) : 1;
}

/** A circle or square to shade, 4 mm across as printed. */
function Mark({ round }: { round?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-4 shrink-0 border-[1.5px] border-shamiri-black align-middle",
        round ? "rounded-full" : "rounded-xs",
      )}
    />
  );
}

/** Digit boxes, 6 by 8 mm each, with an optional format hint under them. */
function Boxes({ count, hint }: { count: number; hint?: string }) {
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span className="flex">
        {Array.from({ length: count }, (_, box) => (
          <span key={box} className="-ml-px h-8 w-6 border border-shamiri-black first:ml-0" />
        ))}
      </span>
      {hint && <span className="text-xs tracking-widest text-shamiri-text-grey">{hint}</span>}
    </span>
  );
}
