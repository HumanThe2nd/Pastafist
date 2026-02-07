import { defaultPreferences, type OnboardingPreferences } from '../types'

const STORAGE_KEY = 'pastafist.preferences'

export const loadPreferences = (): OnboardingPreferences => {
  if (typeof window === 'undefined') return defaultPreferences
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPreferences
    const parsed = JSON.parse(raw) as Partial<OnboardingPreferences>
    return { ...defaultPreferences, ...parsed }
  } catch {
    return defaultPreferences
  }
}

export const savePreferences = (preferences: OnboardingPreferences) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}
