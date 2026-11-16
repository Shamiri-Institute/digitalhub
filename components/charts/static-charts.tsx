import { useId, type ReactNode } from "react";
import { cn } from "#/lib/utils";

// Charts drawn as plain SVG and HTML, so a server-rendered page shows them with its first paint
// and sends no chart code to the browser. Columns sit in a flex row, which sizes and spaces them
// to whatever width the card has; heights and lines are percentages of the plot. Hovering a
// column or a session shows its values in the browser's tooltip, and each chart lists its values
// for screen readers.

export type ChartSeries = {
  name: string;
  color: string;
  /** Drawn faint: context beside the series the viewer reads, such as the hub beside "You". */
  muted?: boolean;
  /** Series with the same stack are stacked in one column; the rest stand side by side. */
  stack?: string;
};
/** `label` is the axis text when it should be shorter than the name the tooltip shows. */
export type ChartCategory = { name: string; label?: string; values: (number | null)[] };
export type RingSlice = { name: string; value: number; color: string };
export type BarListRow = { name: string; value: number };
type FormatValue = (value: number) => string;

const MUTED_OPACITY = 0.35;
// Past this many categories a column chart stops labelling each column with its value, and a
// line chart stops drawing a dot for each value.
const MAX_LABELLED_CATEGORIES = 12;
const MAX_DOTTED_CATEGORIES = 30;
const MAX_NAMED_CATEGORIES = 40;

export const formatNumber: FormatValue = (value) =>
  value.toLocaleString("en", { maximumFractionDigits: 2 });

function percent(share: number) {
  return `${Math.round(share * 1000) / 1000}%`;
}

function sumOf(values: (number | null)[]) {
  return values.reduce<number>((sum, value) => sum + Math.max(value ?? 0, 0), 0);
}

/**
 * A zero-based axis in round steps, at most five, reaching the largest value, the minimum top and
 * the goal. Whole-number data keeps whole-number ticks.
 */
function valueAxis(values: (number | null)[], minimumTop = 0) {
  const present = values.filter((value): value is number => value !== null);
  const largest = Math.max(0, minimumTop, ...present.filter(Number.isFinite));
  if (largest === 0) return { top: 1, ticks: [0, 1] };
  const wholeNumbers = present.every(Number.isInteger) && Number.isInteger(minimumTop);
  const magnitude = 10 ** Math.floor(Math.log10(largest / 5));
  for (const factor of wholeNumbers ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]) {
    const step = wholeNumbers ? Math.max(1, factor * magnitude) : factor * magnitude;
    const stepCount = Math.ceil(largest / step - 1e-9);
    if (stepCount <= 5) {
      return {
        top: stepCount * step,
        ticks: Array.from({ length: stepCount + 1 }, (_, index) =>
          Number((index * step).toPrecision(12)),
        ),
      };
    }
  }
  return { top: largest, ticks: [0, largest] };
}

type Axis = ReturnType<typeof valueAxis>;

function yShare(value: number, axis: Axis) {
  return 100 - (Math.max(value, 0) / axis.top) * 100;
}

function gutterWidth(longestTick: number) {
  if (longestTick <= 2) return "w-5";
  if (longestTick <= 4) return "w-8";
  if (longestTick <= 6) return "w-11";
  return "w-14";
}

/** Short names side by side (every few when crowded), long ones at an angle, too many none. */
function CategoryLabels({ categories }: { categories: ChartCategory[] }) {
  const names = categories.map(({ name, label }) => label ?? name);
  if (names.length > MAX_NAMED_CATEGORIES) return null;
  const longest = Math.max(...names.map((name) => name.length));
  if (longest <= 6 || names.length <= 4 || names.length * longest <= 32) {
    const every = Math.ceil(names.length / 12);
    return (
      <div className="flex">
        {names.map((name, index) => (
          <span
            key={categories[index]?.name}
            className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground"
          >
            {index % every === 0 ? name : ""}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="flex h-16">
      {names.map((name, index) => (
        <span key={categories[index]?.name} className="relative min-w-0 flex-1">
          <span className="absolute right-1/2 top-1 block max-w-20 origin-top-right -rotate-40 truncate whitespace-nowrap text-xs text-muted-foreground">
            {name}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Axes, gridlines and an optional goal around a row of bands, one per category. */
function Frame({
  axis,
  formatValue,
  categories,
  xLabel,
  yLabel,
  goal,
  bands,
  overlay,
}: {
  axis: Axis;
  formatValue: FormatValue;
  categories: ChartCategory[];
  xLabel?: string;
  yLabel?: string;
  goal?: number;
  bands: ReactNode;
  overlay?: ReactNode;
}) {
  const tickLabels = axis.ticks.map(formatValue);
  return (
    <div aria-hidden className="flex min-h-0 flex-1 flex-col gap-2">
      {yLabel ? <p className="truncate text-xs text-muted-foreground">{yLabel}</p> : null}
      <div className="grid min-h-0 flex-1 grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-x-2 gap-y-1.5">
        <svg
          className={cn(
            "h-full overflow-visible",
            gutterWidth(Math.max(...tickLabels.map((tick) => tick.length))),
          )}
        >
          {axis.ticks.map((tick, index) => (
            <text
              key={tick}
              x="100%"
              y={percent(yShare(tick, axis))}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-xs tabular-nums"
            >
              {tickLabels[index]}
            </text>
          ))}
        </svg>
        <div className="relative min-h-0">
          <svg className="absolute inset-0 size-full overflow-visible">
            {axis.ticks.map((tick) => (
              <line
                key={tick}
                x1="0"
                x2="100%"
                y1={percent(yShare(tick, axis))}
                y2={percent(yShare(tick, axis))}
                strokeWidth={1}
                shapeRendering="crispEdges"
                className="stroke-border"
              />
            ))}
            {/* Beneath the columns, so their value labels stay readable where they cross it. */}
            {goal === undefined ? null : (
              <>
                <line
                  x1="0"
                  x2="100%"
                  y1={percent(yShare(goal, axis))}
                  y2={percent(yShare(goal, axis))}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  className="stroke-destructive"
                />
                <text
                  x="100%"
                  y={percent(yShare(goal, axis))}
                  dy={-4}
                  textAnchor="end"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  className="fill-muted-foreground stroke-card text-xs [paint-order:stroke]"
                >
                  Goal {formatValue(goal)}
                </text>
              </>
            )}
          </svg>
          <div className="relative flex h-full">{bands}</div>
          <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
            {overlay}
          </svg>
        </div>
        <span />
        <CategoryLabels categories={categories} />
      </div>
      {xLabel ? <p className="text-center text-xs text-muted-foreground">{xLabel}</p> : null}
    </div>
  );
}

function Legend({ series, mark }: { series: ChartSeries[]; mark: "block" | "line" }) {
  if (series.length < 2) return null;
  return (
    <ul aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map(({ name, color, muted }) => (
        <li key={name} className="flex items-center gap-1.5">
          <svg className="size-2.5 shrink-0" viewBox="0 0 10 10">
            {mark === "block" ? (
              <rect
                width={10}
                height={10}
                rx={2}
                fill={color}
                fillOpacity={muted ? MUTED_OPACITY : 1}
              />
            ) : (
              <line
                x1={1}
                x2={9}
                y1={5}
                y2={5}
                stroke={color}
                strokeOpacity={muted ? MUTED_OPACITY : 1}
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}
          </svg>
          {name}
        </li>
      ))}
    </ul>
  );
}

// A list rather than a table: the page's own data table should be the only table a screen reader
// steps through.
function ValuesList({ label, lines }: { label: string; lines: string[] }) {
  return (
    <figcaption className="sr-only">
      {label}
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </figcaption>
  );
}

function describe(category: ChartCategory, series: ChartSeries[], formatValue: FormatValue) {
  const values = series.flatMap(({ name }, index) => {
    const value = category.values[index];
    return value === null || value === undefined ? [] : [`${name} ${formatValue(value)}`];
  });
  return `${category.name}: ${values.length ? values.join(", ") : "no data"}`;
}

/** One column per stack, its series stacked from the baseline with a 4px rounded top. */
function Column({
  segments,
  axis,
  valueLabel,
  clipId,
}: {
  segments: { value: number; color: string; muted?: boolean; key: string }[];
  axis: Axis;
  valueLabel?: string;
  clipId: string;
}) {
  const total = segments.reduce((sum, { value }) => sum + value, 0);
  const tipShare = yShare(total, axis);
  const placed = segments.map((segment, index) => ({
    ...segment,
    bottom: segments.slice(0, index).reduce((sum, { value }) => sum + value, 0),
  }));
  return (
    <svg className="h-full min-w-0 max-w-5 flex-1 overflow-visible">
      <clipPath id={clipId}>
        {/* Reaching past the baseline keeps the column's foot square. */}
        <rect y={percent(tipShare)} width="100%" height="200%" rx={4} />
      </clipPath>
      <g clipPath={`url(#${clipId})`} className="group-hover:opacity-80">
        {placed.map(({ key, value, bottom, color, muted }) => (
          <rect
            key={key}
            width="100%"
            y={percent(yShare(bottom + value, axis))}
            height={percent((value / axis.top) * 100)}
            fill={color}
            fillOpacity={muted ? MUTED_OPACITY : 1}
          />
        ))}
        {placed.slice(1).map(({ key, bottom }) => (
          <line
            key={key}
            x1="0"
            x2="100%"
            y1={percent(yShare(bottom, axis))}
            y2={percent(yShare(bottom, axis))}
            strokeWidth={2}
            className="stroke-card"
          />
        ))}
      </g>
      {valueLabel ? (
        <text
          x="50%"
          y={percent(tipShare)}
          dy={-4}
          textAnchor="middle"
          strokeWidth={3}
          strokeLinejoin="round"
          className="fill-muted-foreground stroke-card text-xs tabular-nums [paint-order:stroke]"
        >
          {valueLabel}
        </text>
      ) : null}
    </svg>
  );
}

/**
 * Columns per category: series sharing a `stack` stack up, the rest stand side by side, and a
 * category leaves out the columns it has no value for.
 */
export function ColumnChart({
  label,
  categories,
  series,
  formatValue = formatNumber,
  minimumTop,
  goal,
  valueLabels = false,
  xLabel,
  yLabel,
}: {
  label: string;
  categories: ChartCategory[];
  series: ChartSeries[];
  formatValue?: FormatValue;
  minimumTop?: number;
  goal?: number;
  valueLabels?: boolean;
  xLabel?: string;
  yLabel?: string;
}) {
  const clipIdPrefix = useId();
  const stackKeys = [...new Set(series.map(({ stack }, index) => stack ?? `series-${index}`))];
  const columnsOf = (category: ChartCategory) =>
    stackKeys
      .map((stackKey) => ({
        stackKey,
        segments: series.flatMap((entry, index) => {
          const value = category.values[index] ?? 0;
          return (entry.stack ?? `series-${index}`) === stackKey && value > 0
            ? [{ key: entry.name, value, color: entry.color, muted: entry.muted }]
            : [];
        }),
      }))
      .filter(({ segments }) => segments.length > 0);
  const axis = valueAxis(
    categories.flatMap((category) =>
      columnsOf(category).map(({ segments }) => sumOf(segments.map(({ value }) => value))),
    ),
    Math.max(minimumTop ?? 0, goal ?? 0),
  );
  const labelsValues =
    valueLabels && stackKeys.length === 1 && categories.length <= MAX_LABELLED_CATEGORIES;

  return (
    <figure className="flex h-full min-h-0 flex-col gap-3">
      <Frame
        axis={axis}
        formatValue={formatValue}
        categories={categories}
        xLabel={xLabel}
        yLabel={yLabel}
        goal={goal}
        bands={categories.map((category, categoryIndex) => (
          <div
            key={category.name}
            title={describe(category, series, formatValue)}
            className="group flex h-full min-w-0 flex-1 justify-center gap-0.5 px-1"
          >
            {columnsOf(category).map(({ stackKey, segments }) => (
              <Column
                key={stackKey}
                segments={segments}
                axis={axis}
                clipId={`${clipIdPrefix}-${categoryIndex}-${stackKey}`}
                valueLabel={
                  labelsValues ? formatValue(sumOf(segments.map(({ value }) => value))) : undefined
                }
              />
            ))}
          </div>
        ))}
      />
      <Legend series={series} mark="block" />
      <ValuesList
        label={label}
        lines={categories.map((category) => describe(category, series, formatValue))}
      />
    </figure>
  );
}

/** One line per series across the categories; a missing value leaves a gap. */
export function LineChart({
  label,
  categories,
  series,
  formatValue = formatNumber,
  minimumTop,
  xLabel,
  yLabel,
}: {
  label: string;
  categories: ChartCategory[];
  series: ChartSeries[];
  formatValue?: FormatValue;
  minimumTop?: number;
  xLabel?: string;
  yLabel?: string;
}) {
  const axis = valueAxis(
    categories.flatMap(({ values }) => values),
    minimumTop,
  );
  const xShare = (categoryIndex: number) => ((categoryIndex + 0.5) / categories.length) * 100;
  const drawsDots = categories.length <= MAX_DOTTED_CATEGORIES;

  return (
    <figure className="flex h-full min-h-0 flex-col gap-3">
      <Frame
        axis={axis}
        formatValue={formatValue}
        categories={categories}
        xLabel={xLabel}
        yLabel={yLabel}
        bands={categories.map((category) => (
          <div
            key={category.name}
            title={describe(category, series, formatValue)}
            className="group relative h-full min-w-0 flex-1"
          >
            <span className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground opacity-0 group-hover:opacity-100" />
          </div>
        ))}
        overlay={series.map(({ name, color, muted }, seriesIndex) => (
          <g key={name} stroke={color} strokeOpacity={muted ? MUTED_OPACITY : 1}>
            {categories.slice(1).map((category, index) => {
              const from = categories[index]?.values[seriesIndex];
              const to = category.values[seriesIndex];
              return from === null ||
                from === undefined ||
                to === null ||
                to === undefined ? null : (
                <line
                  key={category.name}
                  x1={percent(xShare(index))}
                  y1={percent(yShare(from, axis))}
                  x2={percent(xShare(index + 1))}
                  y2={percent(yShare(to, axis))}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}
            {categories.map((category, categoryIndex) => {
              const value = category.values[seriesIndex];
              return value === null || value === undefined || !drawsDots ? null : (
                <circle
                  key={category.name}
                  cx={percent(xShare(categoryIndex))}
                  cy={percent(yShare(value, axis))}
                  r={4}
                  fill={color}
                  fillOpacity={muted ? MUTED_OPACITY : 1}
                  strokeWidth={2}
                  className="stroke-card"
                />
              );
            })}
          </g>
        ))}
      />
      <Legend series={series} mark="line" />
      <ValuesList
        label={label}
        lines={categories.map((category) => describe(category, series, formatValue))}
      />
    </figure>
  );
}

/** Each row's name, a bar from a shared baseline, and its value: for long names such as people's. */
export function BarList({
  label,
  rows,
  color = "var(--color-primary)",
  formatValue = formatNumber,
}: {
  label: string;
  rows: BarListRow[];
  color?: string;
  formatValue?: FormatValue;
}) {
  const clipIdPrefix = useId();
  const largest = Math.max(0, ...rows.map(({ value }) => value)) || 1;
  return (
    <figure className="flex h-full min-h-0 flex-col">
      <figcaption className="sr-only">{label}</figcaption>
      <ul className="min-h-0 space-y-2 overflow-y-auto pr-1">
        {rows.map(({ name, value }, index) => {
          const share = (Math.max(value, 0) / largest) * 100;
          const clipId = `${clipIdPrefix}-${index}`;
          return (
            <li
              key={name}
              title={`${name}: ${formatValue(value)}`}
              className="group grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs"
            >
              <span className="truncate text-muted-foreground">{name}</span>
              <svg aria-hidden className="h-3 w-full overflow-visible">
                <clipPath id={clipId}>
                  {/* Starting left of the bar keeps its foot square; only its end is rounded. */}
                  <rect x="-100%" width={percent(100 + share)} height="100%" rx={4} />
                </clipPath>
                <rect
                  width={percent(share)}
                  height="100%"
                  fill={color}
                  clipPath={`url(#${clipId})`}
                  className="group-hover:opacity-80"
                />
              </svg>
              <span className="text-right font-medium tabular-nums text-foreground">
                {formatValue(value)}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

const RING_RADIUS = 41;
const RING_WIDTH = 14;
// A slice's share of the ring left blank after it, so neighbouring slices stay apart.
const RING_GAP = 0.6;

/** A ring split into slices clockwise from the top, with a figure in its middle. */
export function RingChart({
  label,
  slices,
  middle,
  sizeClassName,
  formatValue = formatNumber,
}: {
  label: string;
  slices: RingSlice[];
  middle: ReactNode;
  sizeClassName: string;
  formatValue?: FormatValue;
}) {
  const total = slices.reduce((sum, { value }) => sum + Math.max(value, 0), 0);
  const drawn = slices.filter(({ value }) => value > 0);
  const gap = drawn.length > 1 ? RING_GAP : 0;
  const arcs = drawn.map((slice, index) => ({
    ...slice,
    share: (slice.value / total) * 100,
    start: (drawn.slice(0, index).reduce((sum, { value }) => sum + value, 0) / total) * 100,
  }));

  return (
    <div className={cn("relative shrink-0", sizeClassName)}>
      <span className="sr-only">{label}</span>
      <svg aria-hidden viewBox="0 0 100 100" className="size-full">
        {arcs.map(({ name, value, color, share, start }) => (
          <circle
            key={name}
            cx={50}
            cy={50}
            r={RING_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={RING_WIDTH}
            pathLength={100}
            strokeDasharray={`${Math.max(share - gap, 0.01)} ${100 - share + gap}`}
            strokeDashoffset={-start}
            transform="rotate(-90 50 50)"
            className="hover:opacity-80"
          >
            <title>{`${name}: ${formatValue(value)} (${Math.round(share)}%)`}</title>
          </circle>
        ))}
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
      >
        {middle}
      </div>
    </div>
  );
}

/** A ring of parts with their total in the middle, over a legend that names each part's count. */
export function RingBreakdown({
  label,
  slices,
  formatValue = formatNumber,
}: {
  label: string;
  slices: RingSlice[];
  formatValue?: FormatValue;
}) {
  const total = slices.reduce((sum, { value }) => sum + Math.max(value, 0), 0);
  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-3">
      <RingChart
        label={`${label}: ${formatValue(total)}`}
        slices={slices}
        formatValue={formatValue}
        sizeClassName="size-28"
        middle={<span className="text-2xl font-semibold leading-8">{formatValue(total)}</span>}
      />
      <ul className="min-h-0 w-full space-y-1 overflow-y-auto text-xs text-muted-foreground">
        {slices.map(({ name, value, color }) => (
          <li key={name} className="flex items-center gap-1.5">
            <svg aria-hidden className="size-2.5 shrink-0" viewBox="0 0 10 10">
              <rect width={10} height={10} rx={2} fill={color} />
            </svg>
            <span className="min-w-0 flex-1 truncate first-letter:uppercase" title={name}>
              {name}
            </span>
            <span className="font-medium text-foreground tabular-nums">{formatValue(value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** How complete something is, as a ring filled to the percentage. */
export function CompletionRing({ label, percentage }: { label: string; percentage: number }) {
  return (
    <div className="flex h-full items-center justify-center">
      <RingChart
        label={`${label}: ${percentage}%`}
        sizeClassName="size-40"
        slices={[
          { name: "Complete", value: percentage, color: "var(--color-primary)" },
          { name: "Missing", value: 100 - percentage, color: "var(--color-info-bg)" },
        ]}
        middle={<span className="text-2xl font-semibold leading-8">{percentage}%</span>}
      />
    </div>
  );
}
