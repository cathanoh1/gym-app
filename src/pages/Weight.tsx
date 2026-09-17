import { format, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { WeightChart } from '../components/WeightChart'
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  NumberInput,
  PageHeader,
  parseNumber,
  SectionTitle,
  Segmented,
} from '../components/ui'
import { db } from '../db'
import { dayLabel, todayKey } from '../lib/dates'
import { useSettings } from '../lib/settings'
import {
  changeOver,
  formatDelta,
  formatWeight,
  fromDisplayWeight,
  toDisplayWeight,
  withinLastDays,
} from '../lib/weight'

type Range = '30' | '90' | 'all'

export function Weight() {
  const { weightUnit } = useSettings()
  const entries = useLiveQuery(() => db.weightEntries.orderBy('date').toArray(), []) ?? []
  const [range, setRange] = useState<Range>('90')
  const [value, setValue] = useState('')
  const [showAll, setShowAll] = useState(false)

  const latest = entries.at(-1)
  const loggedToday = latest?.date === todayKey()
  const shown = range === 'all' ? entries : withinLastDays(entries, Number(range))
  const weekChange = changeOver(entries, 7)
  const monthChange = changeOver(entries, 30)
  const history = entries
    .map((entry, index) => ({
      entry,
      change: index > 0 ? entry.kg - entries[index - 1].kg : undefined,
    }))
    .reverse()

  async function logWeight(event: FormEvent) {
    event.preventDefault()
    const entered = parseNumber(value)
    if (entered <= 0) return
    const kg = fromDisplayWeight(entered, weightUnit)
    const date = todayKey()
    const existing = await db.weightEntries.where('date').equals(date).first()
    if (existing) {
      await db.weightEntries.update(existing.id, { kg })
    } else {
      await db.weightEntries.add({ date, kg, createdAt: Date.now() })
    }
    setValue('')
  }

  async function removeEntry(id: number, date: string) {
    if (!window.confirm(`Delete the weigh-in for ${format(parseISO(date), 'd MMM yyyy')}?`)) return
    await db.weightEntries.delete(id)
  }

  return (
    <>
      <PageHeader title="Weight" subtitle="Weigh in at the same time each day for a clean trend." />

      <Card className="mb-5 p-4">
        {latest ? (
          <>
            <p className="eyebrow">{loggedToday ? 'Today' : dayLabel(latest.date)}</p>
            <p className="wide font-mono text-4xl font-bold tabular-nums">
              {toDisplayWeight(latest.kg, weightUnit).toFixed(1)}
              <span className="ml-1 text-lg font-medium text-steel">{weightUnit}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-steel">
              <span>
                7 days{' '}
                <span className="font-mono tabular-nums text-iron">
                  {weekChange === undefined ? '—' : formatDelta(weekChange, weightUnit)}
                </span>
              </span>
              <span>
                30 days{' '}
                <span className="font-mono tabular-nums text-iron">
                  {monthChange === undefined ? '—' : formatDelta(monthChange, weightUnit)}
                </span>
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-steel">
            Log your first weigh-in and the trend builds from there.
          </p>
        )}

        <form onSubmit={(event) => void logWeight(event)} className="mt-4 flex gap-2">
          <NumberInput
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={latest ? toDisplayWeight(latest.kg, weightUnit).toFixed(1) : `Weight in ${weightUnit}`}
            aria-label={`Today's weight in ${weightUnit}`}
            autoComplete="off"
          />
          <Button type="submit" className="shrink-0" disabled={parseNumber(value) <= 0}>
            {loggedToday ? 'Update' : 'Log'}
          </Button>
        </form>
      </Card>

      {shown.length >= 2 ? (
        <section className="mb-5">
          <SectionTitle
            action={
              <Segmented
                value={range}
                onChange={setRange}
                options={[
                  { value: '30', label: '30d' },
                  { value: '90', label: '90d' },
                  { value: 'all', label: 'All' },
                ]}
              />
            }
          >
            Trend
          </SectionTitle>
          <Card className="p-3">
            <WeightChart entries={shown} unit={weightUnit} />
          </Card>
        </section>
      ) : null}

      <section>
        <SectionTitle>History</SectionTitle>
        {entries.length === 0 ? (
          <EmptyState
            title="Nothing weighed yet"
            hint="Step on the scales and put the number in above."
          />
        ) : (
          <>
            <Card className="divide-y-2 divide-line">
              {(showAll ? history : history.slice(0, 14)).map(({ entry, change }) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <p className="min-w-0 truncate font-semibold">{dayLabel(entry.date)}</p>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="font-mono font-medium tabular-nums">
                      {formatWeight(entry.kg, weightUnit)}
                    </p>
                    <p className="w-16 text-right font-mono text-xs tabular-nums text-steel">
                      {change === undefined ? '' : formatDelta(change, weightUnit)}
                    </p>
                    <IconButton
                      label={`Delete weigh-in for ${format(parseISO(entry.date), 'd MMMM yyyy')}`}
                      onClick={() => void removeEntry(entry.id, entry.date)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </Card>
            {history.length > 14 ? (
              <Button variant="secondary" className="mt-3 w-full" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show recent only' : `Show all ${history.length} weigh-ins`}
              </Button>
            ) : null}
          </>
        )}
      </section>
    </>
  )
}
