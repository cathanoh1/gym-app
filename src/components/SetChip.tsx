import type { WorkoutSet } from '../db'
import { formatLoad, setIntensity } from '../lib/workouts'

const EDGE_COLOR: Record<ReturnType<typeof setIntensity>, string> = {
  top: 'var(--color-plate-red)',
  near: 'var(--color-plate-yellow)',
  light: 'var(--color-line)',
}

/** A logged set, drawn like a loaded plate: the edge marks how heavy it was for the session. */
export function SetChip({
  set,
  heaviest,
  unit,
}: {
  set: WorkoutSet
  heaviest: number
  unit: 'kg' | 'lb'
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-[2px] border-2 border-iron bg-paper py-1 pr-2.5 pl-1">
      <span
        aria-hidden
        className="h-5 w-1.5 rounded-[1px]"
        style={{ background: EDGE_COLOR[setIntensity(set, heaviest)] }}
      />
      <span className="font-mono text-sm font-medium tabular-nums">
        {set.reps} × {formatLoad(set.weight, unit)}
      </span>
    </span>
  )
}

export function SetChipLegend() {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-1.5 rounded-[1px] bg-plate-red" /> Heaviest set
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-1.5 rounded-[1px] bg-plate-yellow" /> Within 15%
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-1.5 rounded-[1px] bg-line" /> Back-off
      </span>
    </p>
  )
}
