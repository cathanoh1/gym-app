import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_SETTINGS, db, SETTINGS_ID, type Settings } from '../db'

export function useSettings(): Settings {
  const stored = useLiveQuery(() => db.settings.get(SETTINGS_ID), [])
  return stored ?? DEFAULT_SETTINGS
}

export async function saveSettings(changes: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const existing = await db.settings.get(SETTINGS_ID)
  await db.settings.put({ ...(existing ?? DEFAULT_SETTINGS), ...changes, id: SETTINGS_ID })
}
