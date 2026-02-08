import type { DashboardBootstrapResponse, DashboardState, GroceryRunGroup } from '../types'
import { readLocalStore, writeLocalStore } from './localStore'

const DASHBOARD_STATE_KEY = 'dashboard.state'
const LEGACY_STORAGE_KEY = 'pastafist.dashboard_state'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isDashboardState = (value: unknown): value is DashboardState => {
  if (!isRecord(value)) return false
  return (
    Array.isArray(value['meals']) &&
    Array.isArray(value['groups']) &&
    (value['activeRunId'] === null || typeof value['activeRunId'] === 'string')
  )
}

export const deriveActiveRunId = (groups: GroceryRunGroup[]): string | null => {
  return (
    groups.find((group) => group.status === 'current')?.id ??
    groups.find((group) => group.status === 'later')?.id ??
    groups[0]?.id ??
    null
  )
}

export const buildDashboardState = (bootstrap: DashboardBootstrapResponse): DashboardState => {
  return {
    summary: bootstrap.summary,
    meals: bootstrap.meals,
    groups: bootstrap.groceryRuns,
    tripPlan: bootstrap.tripPlan,
    activeRunId: deriveActiveRunId(bootstrap.groceryRuns)
  }
}

const readLegacyLocalStorage = (): DashboardState | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isDashboardState(parsed) ? parsed : null
  } catch {
    return null
  }
}

const removeLegacyLocalStorage = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // ignore cleanup failures
  }
}

export const loadDashboardState = async (): Promise<DashboardState | null> => {
  const indexed = await readLocalStore<unknown>(DASHBOARD_STATE_KEY)
  if (isDashboardState(indexed)) return indexed

  const legacy = readLegacyLocalStorage()
  if (!legacy) return null

  const saved = await writeLocalStore(DASHBOARD_STATE_KEY, legacy)
  if (saved) removeLegacyLocalStorage()
  return legacy
}

export const saveDashboardState = async (state: DashboardState): Promise<void> => {
  const saved = await writeLocalStore(DASHBOARD_STATE_KEY, state)
  if (saved) return

  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}
