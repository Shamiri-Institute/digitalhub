import { useId, type ReactNode } from "react";
import { cn } from "#/lib/utils";

// Charts drawn on the server as plain SVG, so they show with the page's first paint and send no
// chart code to the browser. Positions are percentages of the plot, so a chart fills whatever
// width its card has without measuring it. Hovering a mark shows its values in the browser's
// tooltip, and each chart lists its values for screen readers.

export type ChartSeries = { name: string; color: string };
export type ChartCategory = { name: string; values: number[] };
export type RingSlice = { name: string; value: number; color: string };

// A column is 20px wide, or 55% of its slot when the card is too narrow for that. The x and
// width attributes are the fallback for a browser that cannot size a rect from CSS.
const COLUMN_GEOMETRY = "[width:min(20px,55%)] [x:calc(50%_-_min(10px,27.5%))]";

function percent(share: number) {
  return `${Math.round(share * 1000) / 1000}%`;
}

/** A zero-based axis in round steps (1, 2, 5, 10, ...), at most five, reaching the largest value. */
function valueAxis(largestValue: number) {
  const largest = Number.isFinite(largestValue) ? Math.max(largestValue, 0) : 0;
  for (let magnitude = 1; ; magnitude *= 10) {
    for (const step of [magnitude, 2 * magnitude, 5 * magnitude]) {
      const stepCount = Math.max(1, Math.ceil(largest / step));
      if (stepCount <= 5) {
        return {
          top: stepCount * step,
          ticks: Array.from({ length: stepCount + 1 }, (_, index) => index * step),
        };
      }
    }
  }
}

function Plot({
  ticks,
  top,
  categoryNames,
  children,
}: {
  ticks: number[];
  top: number;
  categoryNames: string[];
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className="grid min-h-0 flex-1 grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-x-2 gap-y-1.5"
    >
      <svg className="h-full w-6 overflow-visible">
        {ticks.map((tick) => (
          <text
            key={tick}
            x="100%"
            y={percent(100 - (tick / top) * 100)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-muted-foreground text-xs tabular-nums"
          >
            {tick}
          </text>
        ))}
      </svg>
      <svg className="h-full w-full overflow-visible">
        {ticks.map((tick) => (
          <line
            key={tick}
            x1="0"
            x2="100%"
            y1={percent(100 - (tick / top) * 100)}
            y2={percent(100 - (tick / top) * 100)}
            strokeWidth={1}
            shapeRendering="crispEdges"
            className="stroke-border"
          />
        ))}
        {children}
      </svg>
      <span />
      <svg className="h-4 w-full overflow-visible">
        {categoryNames.map((name, index) => (
          <text
            key={name}
            x={percent(((index + 0.5) / categoryNames.length) * 100)}
            y={12}
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
          >
            {name}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Legend({ series, mark }: { series: ChartSeries[]; mark: "block" | "line" }) {
  return (
    <ul aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map(({ name, color }) => (
        <li key={name} className="flex items-center gap-1.5">
          <svg className="size-2.5 shrink-0" viewBox="0 0 10 10">
            {mark === "block" ? (
              <rect width={10} height={10} rx={2} fill={color} />
            ) : (
              <line
                x1={1}
                x2={9}
                y1={5}
                y2={5}
                stroke={color}
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

function describe(category: ChartCategory, series: ChartSeries[]) {
  return `${category.name}: ${series
    .map(({ name }, index) => `${name} ${category.values[index] ?? 0}`)
    .join(", ")}`;
}

/** One column per category, its series stacked from the baseline in the order given. */
export function StackedColumnChart({
  label,
  categories,
  series,
}: {
  label: string;
  categories: ChartCategory[];
  series: ChartSeries[];
}) {
  const clipIdPrefix = useId();
  const totals = categories.map(({ values }) =>
    values.reduce((sum, value) => sum + Math.max(value, 0), 0),
  );
  const { top, ticks } = valueAxis(Math.max(...totals));
  const bandShare = 100 / categories.length;
  const heightShare = (value: number) => (value / top) * 100;

  return (
    <figure className="flex h-full flex-col gap-3">
      <Plot ticks={ticks} top={top} categoryNames={categories.map(({ name }) => name)}>
        {categories.map((category, categoryIndex) => {
          const clipId = `${clipIdPrefix}-${categoryIndex}`;
          const segments = category.values.map((value, seriesIndex) => {
            const below = category.values
              .slice(0, seriesIndex)
              .reduce((sum, earlier) => sum + Math.max(earlier, 0), 0);
            return { value: Math.max(value, 0), below, color: series[seriesIndex]?.color };
          });
          return (
            <g key={category.name} className="group">
              <title>{describe(category, series)}</title>
              <rect
                x={percent(categoryIndex * bandShare)}
                width={percent(bandShare)}
                height="100%"
                fill="transparent"
              />
              <svg
                x={percent(categoryIndex * bandShare)}
                width={percent(bandShare)}
                overflow="visible"
              >
                {/* The column's shape: a rounded top, and a foot past the baseline kept square. */}
                <clipPath id={clipId}>
                  <rect
                    x="22.5%"
                    y={percent(100 - heightShare(totals[categoryIndex] ?? 0))}
                    width="55%"
                    height="200%"
                    rx={4}
                    className={COLUMN_GEOMETRY}
                  />
                </clipPath>
                <g clipPath={`url(#${clipId})`} className="group-hover:opacity-80">
                  {segments.map(({ value, below, color }, seriesIndex) =>
                    value > 0 ? (
                      <rect
                        key={series[seriesIndex]?.name}
                        width="100%"
                        y={percent(100 - heightShare(below + value))}
                        height={percent(heightShare(value))}
                        fill={color}
                      />
                    ) : null,
                  )}
                  {segments
                    .slice(1)
                    .map(({ value, below }, index) =>
                      value > 0 && below > 0 ? (
                        <line
                          key={series[index + 1]?.name}
                          x1="0"
                          x2="100%"
                          y1={percent(100 - heightShare(below))}
                          y2={percent(100 - heightShare(below))}
                          strokeWidth={2}
                          className="stroke-card"
                        />
                      ) : null,
                    )}
                </g>
              </svg>
            </g>
          );
        })}
      </Plot>
      <Legend series={series} mark="block" />
      <ValuesList label={label} lines={categories.map((category) => describe(category, series))} />
    </figure>
  );
}

/** One line per series across the categories, each value marked with a dot. */
export function LineChart({
  label,
  categories,
  series,
}: {
  label: string;
  categories: ChartCategory[];
  series: ChartSeries[];
}) {
  const { top, ticks } = valueAxis(Math.max(...categories.flatMap(({ values }) => values)));
  const bandShare = 100 / categories.length;
  const xShare = (categoryIndex: number) => (categoryIndex + 0.5) * bandShare;
  const yShare = (value: number) => 100 - (Math.max(value, 0) / top) * 100;

  return (
    <figure className="flex h-full flex-col gap-3">
      <Plot ticks={ticks} top={top} categoryNames={categories.map(({ name }) => name)}>
        {categories.map((category, categoryIndex) => (
          <g key={category.name} className="group">
            <title>{describe(category, series)}</title>
            <rect
              x={percent(categoryIndex * bandShare)}
              width={percent(bandShare)}
              height="100%"
              fill="transparent"
            />
            <line
              x1={percent(xShare(categoryIndex))}
              x2={percent(xShare(categoryIndex))}
              y1="0"
              y2="100%"
              strokeWidth={1}
              className="stroke-muted-foreground opacity-0 group-hover:opacity-100"
            />
          </g>
        ))}
        {series.map(({ name, color }, seriesIndex) => (
          <g key={name} stroke={color} pointerEvents="none">
            {categories.slice(1).map((category, index) => (
              <line
                key={category.name}
                x1={percent(xShare(index))}
                y1={percent(yShare(categories[index]?.values[seriesIndex] ?? 0))}
                x2={percent(xShare(index + 1))}
                y2={percent(yShare(category.values[seriesIndex] ?? 0))}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
          </g>
        ))}
        {series.map(({ name, color }, seriesIndex) => (
          <g key={name} fill={color} pointerEvents="none">
            {categories.map((category, categoryIndex) => (
              <circle
                key={category.name}
                cx={percent(xShare(categoryIndex))}
                cy={percent(yShare(category.values[seriesIndex] ?? 0))}
                r={4}
                strokeWidth={2}
                className="stroke-card"
              />
            ))}
          </g>
        ))}
      </Plot>
      <Legend series={series} mark="line" />
      <ValuesList label={label} lines={categories.map((category) => describe(category, series))} />
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
}: {
  label: string;
  slices: RingSlice[];
  middle: ReactNode;
  sizeClassName: string;
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
            <title>{`${name}: ${value} (${Math.round(share)}%)`}</title>
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
