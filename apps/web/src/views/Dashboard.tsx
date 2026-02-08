import { useEffect, useRef, useState } from 'react'
import GroceryList from '../components/dashboard/GroceryList'
import MealSchedule from '../components/dashboard/MealSchedule'
import PlanSummaryCard from '../components/dashboard/PlanSummaryCard'
import TripPlanner from '../components/dashboard/TripPlanner'
import {
  SHOPPING_FREQUENCY_OPTIONS,
  type DashboardState,
  type OnboardingPreferences,
} from '../types'
import { fetchDashboardBootstrap } from '../utils/dashboardApi'
import { buildDashboardState, deriveActiveRunId, loadDashboardState, saveDashboardState } from '../utils/dashboardState'

const SKIP_INDEXEDDB_READ = import.meta.env['VITE_SKIP_INDEXEDDB'] === 'true'

type DashboardProps = {
  onUpdatePreferences: () => void
  preferences: OnboardingPreferences
}

const normalizeDashboardState = (state: DashboardState): DashboardState => {
  const groups = state.groups.map((group) => {
    if (group.status !== 'current') return group
    if (group.items.length > 0 && group.items.every((item) => item.purchased)) {
      return { ...group, status: 'purchased' as const }
    }
    return group
  })

  const activeRunId =
    state.activeRunId && groups.some((group) => group.id === state.activeRunId)
      ? state.activeRunId
      : deriveActiveRunId(groups)

  return { ...state, groups, activeRunId }
}

export default function Dashboard({ onUpdatePreferences, preferences }: DashboardProps) {
  const [dashboard, setDashboard] = useState<DashboardState | null>(null)
  const groceryListRef = useRef<HTMLDivElement | null>(null)
  const [dashboardHydrated, setDashboardHydrated] = useState(false)

  const shoppingIntervalDays = preferences.shoppingFrequency
  const shoppingFrequencyLabel =
    SHOPPING_FREQUENCY_OPTIONS.find((option) => option.value === preferences.shoppingFrequency)?.label ?? 'Weekly'

  const updateDashboard = (updater: (prev: DashboardState) => DashboardState) => {
    setDashboard((prev) => {
      if (!prev) return prev
      const next = normalizeDashboardState(updater(prev))
      void saveDashboardState(next)
      return next
    })
  }

  useEffect(() => {
    let isCancelled = false

    const hydrateDashboard = async () => {
      setDashboardHydrated(false)

      if (!SKIP_INDEXEDDB_READ) {
        const cached = await loadDashboardState()
        if (cached) {
          if (isCancelled) return
          setDashboard(normalizeDashboardState(cached))
          setDashboardHydrated(true)
          return
        }
      }

      const bootstrap = await fetchDashboardBootstrap(preferences)
      const next = normalizeDashboardState(buildDashboardState(bootstrap))
      if (isCancelled) return
      setDashboard(next)
      void saveDashboardState(next)
    }

    void hydrateDashboard().finally(() => {
      if (!isCancelled) {
        setDashboardHydrated(true)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [preferences])

  const toggleItem = (id: string) => {
    updateDashboard((prev) => ({
      ...prev,
      groups: prev.groups.map((group) => ({
        ...group,
        items: group.items.map((item) => (item.id === id ? { ...item, purchased: !item.purchased } : item))
      }))
    }))
  }

  const groups = dashboard?.groups ?? []
  const meals = dashboard?.meals ?? []
  const summary = dashboard?.summary ?? null
  const tripPlan = dashboard?.tripPlan ?? null
  const activeRunId = dashboard?.activeRunId ?? null

  const activeRun =
    groups.find((group) => group.id === activeRunId) ??
    groups.find((group) => group.status === 'current') ??
    groups.find((group) => group.status === 'later') ??
    groups[0]

  const setItemStore = (id: string, store: string) => {
    if (!activeRun) return
    updateDashboard((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === activeRun.id
          ? {
              ...group,
              items: group.items.map((item) =>
                item.id === id ? { ...item, bestStore: store, purchased: false } : item
              )
            }
          : group
      )
    }))
  }

  const markStoreDone = (store: string) => {
    if (!activeRun) return
    updateDashboard((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === activeRun.id
          ? {
              ...group,
              items: group.items.map((item) =>
                item.bestStore === store ? { ...item, purchased: true } : item
              )
            }
          : group
      )
    }))
  }

  const startRun = () => {
    updateDashboard((prev) => {
      const hasCurrent = prev.groups.some((group) => group.status === 'current')
      if (hasCurrent) return prev
      const nextIndex = prev.groups.findIndex((group) => group.status === 'later')
      if (nextIndex === -1) return prev
      return {
        ...prev,
        groups: prev.groups.map((group, index) =>
          index === nextIndex ? { ...group, status: 'current' } : group
        )
      }
    })
    viewGroceryList()
  }

  const finishRun = () => {
    updateDashboard((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.status === 'current'
          ? {
              ...group,
              status: 'purchased',
              items: group.items.map((item) => ({ ...item, purchased: true }))
            }
          : group
      )
    }))
  }

  const swapMeal = (id: string) => {
    updateDashboard((prev) => ({
      ...prev,
      meals: prev.meals.map((meal) =>
        meal.id === id
          ? {
              ...meal,
              title: meal.title === 'Chef surprise' ? 'Seasonal bowl' : 'Chef surprise'
            }
          : meal
      )
    }))
  }

  const viewGroceryList = () => {
    groceryListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!dashboardHydrated) {
    return (
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm text-ink/60 shadow-soft dark:bg-[#1a1411] dark:text-[#c8b9a9]">
          Loading local dashboard state...
        </div>
      </section>
    )
  }

  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
      <div className="grid gap-6">
        {summary ? (
          <PlanSummaryCard summary={summary} onUpdatePreferences={onUpdatePreferences} onViewGroceryList={viewGroceryList} />
        ) : null}
        <MealSchedule meals={meals} mealsPerDay={preferences.mealsPerDay} onSwap={swapMeal} />
        {tripPlan ? (
          <TripPlanner
            plan={tripPlan}
            items={activeRun?.items ?? []}
            onToggleItem={toggleItem}
            onSetItemStore={setItemStore}
            onMarkStoreDone={markStoreDone}
          />
        ) : (
          <div className="rounded-3xl border border-ink/10 bg-white px-6 py-5 text-sm text-ink/60 shadow-soft dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#c8b9a9]">
            Trip planner unavailable until dashboard data is loaded from the server.
          </div>
        )}
      </div>

      <div className="grid gap-6">
        <div ref={groceryListRef}>
          <GroceryList
            groups={groups}
            shoppingIntervalDays={shoppingIntervalDays}
            shoppingFrequencyLabel={shoppingFrequencyLabel}
            onToggleItem={toggleItem}
            onStartRun={startRun}
            onFinishRun={finishRun}
            activeRunId={activeRunId}
            onRunChange={(id) => {
              updateDashboard((prev) => ({ ...prev, activeRunId: id }))
            }}
          />
        </div>
      </div>
    </section>
  )
}
