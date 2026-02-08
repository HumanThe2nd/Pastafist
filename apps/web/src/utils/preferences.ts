import { defaultPreferences, type OnboardingPreferences } from '../types'
import { readLocalStore, writeLocalStore } from './localStore'

const LEGACY_STORAGE_KEY = 'pastafist.preferences'
const PREFERENCES_KEY = 'onboarding.preferences'

const normalizePreferences = (value: unknown): OnboardingPreferences => {
  if (!value || typeof value !== 'object') {
    return defaultPreferences
  }
  return { ...defaultPreferences, ...(value as Partial<OnboardingPreferences>) }
}

const readFromIndexedDb = async (): Promise<OnboardingPreferences | null> => {
  const record = await readLocalStore<unknown>(PREFERENCES_KEY)
  if (!record) return null
  return normalizePreferences(record)
}

const writeToIndexedDb = async (preferences: OnboardingPreferences): Promise<boolean> => {
  return await writeLocalStore(PREFERENCES_KEY, preferences)
}

const readLegacyLocalStorage = (): OnboardingPreferences | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return normalizePreferences(parsed)
  } catch {
    return null
  }
}

const removeLegacyLocalStorage = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // ignore legacy cleanup failures
  }
}

export const loadPreferences = async (): Promise<OnboardingPreferences> => {
  const indexed = await readFromIndexedDb()
  if (indexed) return indexed

  const legacy = readLegacyLocalStorage()
  if (!legacy) return defaultPreferences

  await writeToIndexedDb(legacy)
  removeLegacyLocalStorage()
  return legacy
}

export const savePreferences = async (preferences: OnboardingPreferences): Promise<void> => {
  const saved = await writeToIndexedDb(preferences)
  if (saved) return

  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}
