import { addDays, format, parseISO } from 'date-fns'

/** A calendar day in `yyyy-MM-dd` form. Every record in the app is filed under one. */
export type DateKey = string

export function toKey(date: Date): DateKey {
  return format(date, 'yyyy-MM-dd')
}

export function todayKey(): DateKey {
  return toKey(new Date())
}

export function shiftKey(key: DateKey, days: number): DateKey {
  return toKey(addDays(parseISO(key), days))
}

export function lastNDays(n: number, from: DateKey = todayKey()): DateKey[] {
  return Array.from({ length: n }, (_, i) => shiftKey(from, i - (n - 1)))
}

export function dayLabel(key: DateKey): string {
  if (key === todayKey()) return 'Today'
  if (key === shiftKey(todayKey(), -1)) return 'Yesterday'
  return format(parseISO(key), 'EEE d MMM')
}

export function weekdayInitial(key: DateKey): string {
  return format(parseISO(key), 'EEEEE')
}
