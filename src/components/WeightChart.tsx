import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { WeightEntry } from '../db'
import { formatWeight, toDisplayWeight, trailingAverage, type WeightUnit } from '../lib/weight'

const WIDTH = 320
const HEIGHT = 156
const PADDING = { top: 10, right: 10, bottom: 20, left: 36 }

/**
 * Daily weigh-ins as light dots under a bolder 7-day average, because day-to-day scale
 * noise is larger than the change anyone is actually looking for.
 */
export function WeightChart({ entries, unit }: { entries: WeightEntry[]; unit: WeightUnit }) {
  const daily = entries.map((entry) => toDisplayWeight(entry.kg, unit))
  const trend = entries.map((_, index) => toDisplayWeight(trailingAverage(entries, index), unit))

  const low = Math.min(...daily)
  const high = Math.max(...daily)
  const headroom = (high - low || 1) * 0.2
  const yMin = low - headroom
  const yMax = high + headroom

  const firstDate = parseISO(entries[0].date)
  const lastDate = parseISO(entries[entries.length - 1].date)
  const daySpan = Math.max(1, differenceInCalendarDays(lastDate, firstDate))

  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom

  const xFor = (date: string) =>
    PADDING.left + (differenceInCalendarDays(parseISO(date), firstDate) / daySpan) * plotWidth
  const yFor = (value: number) => PADDING.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight

  const trendPath = entries
    .map(
      (entry, index) =>
        `${index === 0 ? 'M' : 'L'}${xFor(entry.date).toFixed(1)},${yFor(trend[index]).toFixed(1)}`,
    )
    .join(' ')

  const gridValues = [high, (high + low) / 2, low]

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Body weight from ${format(firstDate, 'd MMMM yyyy')} to ${format(
          lastDate,
          'd MMMM yyyy',
        )}, ${formatWeight(entries[0].kg, unit)} to ${formatWeight(
          entries[entries.length - 1].kg,
          unit,
        )}`}
      >
        {gridValues.map((value, index) => (
          <g key={index}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yFor(value)}
              y2={yFor(value)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 5}
              y={yFor(value) + 3}
              textAnchor="end"
              fontSize="8"
              fill="var(--color-steel)"
              className="font-mono"
            >
              {value.toFixed(1)}
            </text>
          </g>
        ))}

        {entries.map((entry, index) => (
          <circle
            key={entry.id}
            cx={xFor(entry.date)}
            cy={yFor(daily[index])}
            r="2"
            fill="var(--color-steel)"
            opacity="0.55"
          />
        ))}

        <path
          d={trendPath}
          fill="none"
          stroke="var(--color-iron)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={xFor(entries[entries.length - 1].date)}
          cy={yFor(trend[trend.length - 1])}
          r="3.5"
          fill="var(--color-iron)"
        />

        <text
          x={PADDING.left}
          y={HEIGHT - 6}
          fontSize="8"
          fill="var(--color-steel)"
          className="font-mono"
        >
          {format(firstDate, 'd MMM')}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 6}
          textAnchor="end"
          fontSize="8"
          fill="var(--color-steel)"
          className="font-mono"
        >
          {format(lastDate, 'd MMM')}
        </text>
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-iron" /> 7-day average
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-steel/60" /> Daily weigh-in
        </span>
      </figcaption>
    </figure>
  )
}
