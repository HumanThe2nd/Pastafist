import { defaultPreferences, type OnboardingPreferences } from '../types'
import { readLocalStore, writeLocalStore } from './localStore'

const LEGACY_STORAGE_KEY = 'pastafist.preferences'
const PREFERENCES_KEY = 'onboarding.preferences'

const dietValues: OnboardingPreferences['dietType'][] = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'halal',
  'kosher',
  'keto',
  'gluten-free',
  'dairy-free'
]

const macroValues: OnboardingPreferences['macroFocus'][] = [
  'balanced',
  'high-protein',
  'low-carb',
  'high-fiber'
]

const allergyValues: OnboardingPreferences['allergies'][number][] = [
  'peanuts',
  'tree nuts',
  'dairy',
  'eggs',
  'soy',
  'gluten'
]

const legacyShoppingFrequencyMap: Record<string, number> = {
  every_other_day: 2,
  twice_weekly: 3.5,
  weekly: 7,
  biweekly: 14,
  monthly: 30
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toFiniteNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

const toPositiveNumber = (value: unknown, fallback: number): number => {
  const parsed = toFiniteNumber(value, fallback)
  return parsed > 0 ? parsed : fallback
}

const normalizeLocation = (value: unknown): OnboardingPreferences['location'] => {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  ) {
    return [value[0], value[1]]
  }
  if (typeof value === 'string') {
    const parts = value.split(',').map((part) => part.trim())
    if (parts.length === 2) {
      const lat = Number(parts[0])
      const lng = Number(parts[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [lat, lng]
      }
    }
  }
  return defaultPreferences.location
}

const normalizeAllergies = (value: unknown): OnboardingPreferences['allergies'] => {
  if (!Array.isArray(value)) return []
  const mapped = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => (item === 'egg' ? 'eggs' : item))
  return mapped.filter((item): item is OnboardingPreferences['allergies'][number] =>
    allergyValues.includes(item as OnboardingPreferences['allergies'][number])
  )
}

const normalizeShoppingFrequency = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 && value <= 365 ? value : defaultPreferences.shoppingFrequency
  }
  if (typeof value === 'string' && value in legacyShoppingFrequencyMap) {
    const mapped = legacyShoppingFrequencyMap[value]
    return typeof mapped === 'number' ? mapped : defaultPreferences.shoppingFrequency
  }
  return defaultPreferences.shoppingFrequency
}

const normalizePreferences = (value: unknown): OnboardingPreferences => {
  if (!isRecord(value)) {
    return defaultPreferences
  }

  const legacyMinutes = toFiniteNumber(value['travelRadiusMinutes'], defaultPreferences.travelRadiusMeters / 80)
  const normalizedTravelRadius =
    'travelRadiusMeters' in value
      ? Math.max(0, Math.round(toFiniteNumber(value['travelRadiusMeters'], defaultPreferences.travelRadiusMeters)))
      : Math.max(0, Math.round(legacyMinutes * 80))

  const normalizedDiet = dietValues.includes(value['dietType'] as OnboardingPreferences['dietType'])
    ? (value['dietType'] as OnboardingPreferences['dietType'])
    : defaultPreferences.dietType

  const normalizedMacro = macroValues.includes(value['macroFocus'] as OnboardingPreferences['macroFocus'])
    ? (value['macroFocus'] as OnboardingPreferences['macroFocus'])
    : defaultPreferences.macroFocus

  return {
    budget: toPositiveNumber(value['budget'], defaultPreferences.budget),
    mealsPerDay: Math.max(1, Math.round(toPositiveNumber(value['mealsPerDay'], defaultPreferences.mealsPerDay))),
    travelRadiusMeters: normalizedTravelRadius,
    dietType: normalizedDiet,
    allergies: normalizeAllergies(value['allergies']),
    macroFocus: normalizedMacro,
    location: normalizeLocation(value['location']),
    shoppingFrequency: normalizeShoppingFrequency(value['shoppingFrequency'])
  }
}

export const sanitizePreferences = (value: unknown): OnboardingPreferences => {
  return normalizePreferences(value)
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
  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) return null
  const parsed = JSON.parse(raw) as unknown
  return normalizePreferences(parsed)
}

const removeLegacyLocalStorage = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
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
  window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(preferences))
}
