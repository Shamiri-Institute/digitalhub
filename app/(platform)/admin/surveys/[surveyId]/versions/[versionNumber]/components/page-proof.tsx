import { printFont } from "#/app/fonts/print-font";
import {
  type CopyValues,
  type Drawable,
  headerValueRun,
  type Layout,
  type LayoutPage,
  type Prefill,
  qrPlaceholderRun,
  type Rect,
  type TextRun,
} from "#/lib/survey/layout";
import { cn } from "#/lib/utils";

interface PageProofProps {
  paper: Layout["paper"];
  page: LayoutPage;
  copy: CopyValues<Prefill>;
  /** What keeps this page from printing, in words. */
  problems: string[];
  /** The item open for editing, outlined on the sheet. */
  openItemId: string | undefined;
  itemsWithIssues: Set<string>;
}

/**
 * One page of the print layout, drawn as an SVG in PDF points. It paints what the layout engine
 * placed and decides nothing itself, so it shows what the PDF prints. Each run is held to the
 * width the engine measured. Items that don't fit hang below the sheet, on the desk.
 */
export default function PageProof({
  paper,
  page,
  copy,
  problems,
  openItemId,
  itemsWithIssues,
}: PageProofProps) {
  const lowest = Math.max(paper.height, ...page.items.map(({ box }) => box.y + box.h + 12));
  return (
    <figure className="space-y-3">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold">Print preview</span>
        <span
          className={cn(
            "text-xs",
            problems.length > 0 ? "font-medium text-red-base" : "text-shamiri-text-grey",
          )}
        >
          {problems.length > 0 ? "Doesn't print" : "A4 · fits"}
        </span>
      </figcaption>
      {problems.map((problem) => (
        <p key={problem} className="rounded-md bg-red-bg px-3 py-2 text-sm text-red-base">
          {problem}
        </p>
      ))}
      <div className="overflow-x-auto rounded-xl bg-muted p-4">
        <svg
          viewBox={`0 0 ${paper.width} ${lowest}`}
          aria-hidden="true"
          className={cn(
            "block h-auto w-full [font-kerning:none] [font-variant-ligatures:none]",
            printFont.className,
          )}
        >
          <rect width={paper.width} height={paper.height} className="fill-white drop-shadow-md" />
          {page.items.map(({ itemId, box }) => {
            const open = itemId === openItemId;
            if (!open && !itemsWithIssues.has(itemId)) {
              return null;
            }
            return (
              <rect
                key={itemId}
                x={box.x - 4}
                y={box.y - 4}
                width={box.w + 8}
                height={Math.max(box.h, 12) + 8}
                rx={4}
                strokeWidth={open ? 2 : 1.5}
                className={
                  open ? "fill-blue-bg stroke-shamiri-new-blue" : "fill-red-bg stroke-red-base"
                }
              />
            );
          })}
          <g className="fill-shamiri-black">
            {Object.entries(page.markers).map(([corner, marker]) => (
              <rect key={corner} x={marker.x} y={marker.y} width={marker.w} height={marker.h} />
            ))}
          </g>
          <QrPlaceholder qr={page.qr} />
          {page.header.map((slot) => (
            <g key={slot.slot}>
              <Text run={slot.label} />
              <Text run={headerValueRun(slot, copy)} />
            </g>
          ))}
          {page.content.map((drawable, i) => (
            // oxlint-disable-next-line react/no-array-index-key -- drawables are positional and redrawn whole
            <Ink key={i} drawable={drawable} />
          ))}
          {page.items.map(
            ({ itemId, standIn }) =>
              standIn && (
                <Text key={itemId} run={standIn} className="fill-shamiri-text-grey italic" />
              ),
          )}
          {page.items.length === 0 && (
            <text
              x={paper.width / 2}
              y={paper.height / 2}
              fontSize={11}
              textAnchor="middle"
              className="fill-shamiri-text-grey"
            >
              Items you add appear here as they print.
            </text>
          )}
        </svg>
      </div>
    </figure>
  );
}

function Text({ run, className }: { run: TextRun; className?: string }) {
  return (
    <text
      x={run.x}
      y={run.baseline}
      fontSize={run.size}
      fontWeight={run.weight}
      textLength={run.width > 0 ? run.width : undefined}
      lengthAdjust="spacing"
      className={cn("fill-shamiri-black whitespace-pre", className)}
    >
      {run.text}
    </text>
  );
}

function Ink({ drawable }: { drawable: Drawable }) {
  switch (drawable.kind) {
    case "text":
      return <Text run={drawable.run} />;
    case "rect": {
      const { x, y, w, h } = drawable.rect;
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          strokeWidth={drawable.stroke}
          className="fill-none stroke-shamiri-black"
        />
      );
    }
    case "circle":
      return (
        <circle
          cx={drawable.cx}
          cy={drawable.cy}
          r={drawable.r}
          strokeWidth={drawable.stroke}
          className="fill-none stroke-shamiri-black"
        />
      );
    case "line":
      return (
        <line
          x1={drawable.x1}
          y1={drawable.y1}
          x2={drawable.x2}
          y2={drawable.y2}
          strokeWidth={drawable.stroke}
          strokeDasharray={drawable.dotted ? "0.1 2.5" : undefined}
          strokeLinecap={drawable.dotted ? "round" : undefined}
          className="stroke-shamiri-black"
        />
      );
  }
}

/** Where each copy's page code prints once print runs exist. */
function QrPlaceholder({ qr }: { qr: Rect }) {
  return (
    <g>
      <rect
        x={qr.x}
        y={qr.y}
        width={qr.w}
        height={qr.h}
        strokeDasharray="3 2"
        className="fill-none stroke-shamiri-text-grey"
      />
      <Text run={qrPlaceholderRun(qr)} className="fill-shamiri-text-grey" />
    </g>
  );
}
