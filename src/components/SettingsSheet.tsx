import { useEffect, useRef, useState } from 'react'
import { db } from '../db'
import { todayKey } from '../lib/dates'
import { caloriesFromMacros } from '../lib/nutrition'
import { saveSettings, useSettings } from '../lib/settings'
import { Button, Field, NumberInput, parseNumber, Segmented, Sheet } from './ui'

async function exportBackup(): Promise<void> {
  const payload: Record<string, unknown[]> = {}
  for (const table of db.tables) {
    payload[table.name] = await table.toArray()
  }
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...payload }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `gym-backup-${todayKey()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function importBackup(file: File): Promise<void> {
  const payload: unknown = JSON.parse(await file.text())
  if (typeof payload !== 'object' || payload === null) throw new Error('That file is not a Gym backup.')
  const record = payload as Record<string, unknown>
  const restorable = db.tables.filter((table) => Array.isArray(record[table.name]))
  if (restorable.length === 0) throw new Error('That file has no Gym data in it.')
  await db.transaction('rw', db.tables, async () => {
    for (const table of restorable) {
      await table.clear()
      await table.bulkPut(record[table.name] as unknown[])
    }
  })
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettings()
  const fileInput = useRef<HTMLInputElement>(null)
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setCalories(String(settings.calorieGoal))
    setProtein(String(settings.proteinGoal))
    setCarbs(String(settings.carbGoal))
    setFat(String(settings.fatGoal))
    setMessage(null)
  }, [open, settings])

  const macroCalories = caloriesFromMacros(parseNumber(protein), parseNumber(carbs), parseNumber(fat))

  async function handleSaveGoals() {
    await saveSettings({
      calorieGoal: Math.round(parseNumber(calories, settings.calorieGoal)),
      proteinGoal: Math.round(parseNumber(protein, settings.proteinGoal)),
      carbGoal: Math.round(parseNumber(carbs, settings.carbGoal)),
      fatGoal: Math.round(parseNumber(fat, settings.fatGoal)),
    })
    setMessage('Goals saved.')
  }

  async function handleImport(file: File) {
    try {
      await importBackup(file)
      setMessage('Backup restored.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That file could not be read.')
    }
  }

  async function handleReset() {
    if (!window.confirm('Delete every workout, habit and food entry on this device? This cannot be undone.')) return
    await db.delete()
    window.location.reload()
  }

  return (
    <Sheet open={open} title="Settings" onClose={onClose}>
      <div className="grid gap-5">
        <div>
          <h3 className="eyebrow mb-2">Daily goals</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calories">
              <NumberInput value={calories} onChange={(event) => setCalories(event.target.value)} />
            </Field>
            <Field label="Protein (g)">
              <NumberInput value={protein} onChange={(event) => setProtein(event.target.value)} />
            </Field>
            <Field label="Carbs (g)">
              <NumberInput value={carbs} onChange={(event) => setCarbs(event.target.value)} />
            </Field>
            <Field label="Fat (g)">
              <NumberInput value={fat} onChange={(event) => setFat(event.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-steel">
            Those macros come to{' '}
            <span className="font-mono tabular-nums">{Math.round(macroCalories)}</span> kcal.
          </p>
          <Button className="mt-3 w-full" onClick={() => void handleSaveGoals()}>
            Save goals
          </Button>
        </div>

        <div>
          <h3 className="eyebrow mb-2">Weight unit</h3>
          <Segmented
            value={settings.weightUnit}
            onChange={(weightUnit) => void saveSettings({ weightUnit })}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
        </div>

        <div>
          <h3 className="eyebrow mb-2">Your data</h3>
          <p className="mb-3 text-sm text-steel">
            Everything is stored in this browser only. Export a backup before clearing browsing data or
            moving to a new phone.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void exportBackup()}>
              Export backup
            </Button>
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              Restore backup
            </Button>
            <Button variant="danger" onClick={() => void handleReset()}>
              Delete all data
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleImport(file)
              event.target.value = ''
            }}
          />
        </div>

        {message ? <p className="text-sm font-semibold">{message}</p> : null}
      </div>
    </Sheet>
  )
}
