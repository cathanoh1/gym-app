import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_SETTINGS, db, SETTINGS_ID, type Settings } from '../db'

/** Undefined only while the query is in flight, so callers can wait for real values. */
export function useLoadedSettings(): Settings | undefined {
  return useLiveQuery(async () => (await db.settings.get(SETTINGS_ID)) ?? DEFAULT_SETTINGS, [])
}

export function useSettings(): Settings {
  return useLoadedSettings() ?? DEFAULT_SETTINGS
}

export async function saveSettings(changes: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const existing = await db.settings.get(SETTINGS_ID)
  await db.settings.put({ ...(existing ?? DEFAULT_SETTINGS), ...changes, id: SETTINGS_ID })
}
