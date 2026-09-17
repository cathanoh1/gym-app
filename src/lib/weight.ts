import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { WeightEntry } from '../db'

const LB_PER_KG = 2.20462

export type WeightUnit = 'kg' | 'lb'

export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg * LB_PER_KG : kg
}

export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value / LB_PER_KG : value
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${toDisplayWeight(kg, unit).toFixed(1)} ${unit}`
}

export function formatDelta(kg: number, unit: WeightUnit): string {
  const value = toDisplayWeight(kg, unit)
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(1)} ${unit}`
}

/**
 * Mean of every weigh-in in the trailing window, counted in calendar days rather than
 * entries, so a week with three weigh-ins is not treated like a week with seven.
 * `entries` must be sorted oldest first.
 */
export function trailingAverage(entries: WeightEntry[], index: number, days = 7): number {
  const end = parseISO(entries[index].date)
  let sum = 0
  let count = 0
  for (let i = index; i >= 0; i -= 1) {
    if (differenceInCalendarDays(end, parseISO(entries[i].date)) >= days) break
    sum += entries[i].kg
    count += 1
  }
  return sum / count
}

/** Change from the most recent weigh-in back to the newest one at least `days` older. */
export function changeOver(entries: WeightEntry[], days: number): number | undefined {
  if (entries.length < 2) return undefined
  const latest = entries[entries.length - 1]
  const latestDate = parseISO(latest.date)
  for (let i = entries.length - 2; i >= 0; i -= 1) {
    if (differenceInCalendarDays(latestDate, parseISO(entries[i].date)) >= days) {
      return latest.kg - entries[i].kg
    }
  }
  return undefined
}

export function withinLastDays(entries: WeightEntry[], days: number): WeightEntry[] {
  if (entries.length === 0) return entries
  const latest = parseISO(entries[entries.length - 1].date)
  return entries.filter((entry) => differenceInCalendarDays(latest, parseISO(entry.date)) < days)
}
