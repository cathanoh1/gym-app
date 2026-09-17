import type { WorkoutEntry, WorkoutSet } from '../db'

export function setVolume(set: WorkoutSet): number {
  return set.reps * set.weight
}

export function entryVolume(entry: WorkoutEntry): number {
  return entry.sets.reduce((total, set) => total + setVolume(set), 0)
}

export function heaviestWeight(sets: WorkoutSet[]): number {
  return sets.reduce((max, set) => Math.max(max, set.weight), 0)
}

export function topSet(sets: WorkoutSet[]): WorkoutSet | undefined {
  return sets.reduce<WorkoutSet | undefined>((best, set) => {
    if (!best) return set
    if (set.weight > best.weight) return set
    if (set.weight === best.weight && set.reps > best.reps) return set
    return best
  }, undefined)
}

export function formatLoad(weight: number, unit: 'kg' | 'lb'): string {
  if (weight === 0) return 'BW'
  const rounded = Number.isInteger(weight) ? String(weight) : weight.toFixed(1)
  return `${rounded} ${unit}`
}

/** Sets at or above the session's heaviest load are top sets; the rest are back-offs. */
export function setIntensity(set: WorkoutSet, heaviest: number): 'top' | 'near' | 'light' {
  if (heaviest === 0) return 'light'
  const ratio = set.weight / heaviest
  if (ratio >= 1) return 'top'
  if (ratio >= 0.85) return 'near'
  return 'light'
}

export function formatVolume(volume: number, unit: 'kg' | 'lb'): string {
  return `${Math.round(volume).toLocaleString('en-GB')} ${unit}`
}
