import { useEffect, useMemo, useRef, useState } from 'react'
import GroceryList from '../components/dashboard/GroceryList'
import MealSchedule from '../components/dashboard/MealSchedule'
import PlanSummaryCard from '../components/dashboard/PlanSummaryCard'
import { groceryList, planMeals, planSummary } from '../data/dashboard'
import { loadPreferences } from '../utils/preferences'
import { SHOPPING_FREQUENCY_OPTIONS, SHOPPING_INTERVAL_DAYS } from '../types'

type DashboardProps = {
  onUpdatePreferences: () => void
}

export default function Dashboard({ onUpdatePreferences }: DashboardProps) {
  const [preferences] = useState(loadPreferences)
  const [meals, setMeals] = useState(planMeals)
  const [items, setItems] = useState(groceryList)
  const [activeRunIds, setActiveRunIds] = useState<string[] | null>(null)
  const groceryListRef = useRef<HTMLDivElement | null>(null)

  const remainingItems = items.filter((item) => !item.purchased).length
  const shoppingIntervalDays = SHOPPING_INTERVAL_DAYS[preferences.shoppingFrequency]
  const shoppingFrequencyLabel =
    SHOPPING_FREQUENCY_OPTIONS.find((option) => option.value === preferences.shoppingFrequency)?.label ?? 'Weekly'
  const runsPerWeek = Math.max(1, Math.round(7 / shoppingIntervalDays))

  const { runItems, laterItems, purchasedItems } = useMemo(() => {
    const pendingItems = items.filter((item) => !item.purchased)
    const itemsPerRun = Math.max(1, Math.ceil(pendingItems.length / runsPerWeek))
    const previewRun = pendingItems.slice(0, itemsPerRun)
    const runIds = activeRunIds
    const activeItems = runIds ? items.filter((item) => runIds.includes(item.id)) : previewRun
    const later =
      runIds && runIds.length > 0
        ? pendingItems.filter((item) => !runIds.includes(item.id))
        : pendingItems.slice(itemsPerRun)
    return {
      runItems: activeItems,
      laterItems: later,
      purchasedItems: items.filter((item) => item.purchased)
    }
  }, [items, activeRunIds, runsPerWeek])

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, purchased: !item.purchased } : item)))
  }

  const markAllDone = () => {
    setItems((prev) => prev.map((item) => ({ ...item, purchased: true })))
    setActiveRunIds(null)
  }

  const startRun = () => {
    if (remainingItems === 0 || (activeRunIds && activeRunIds.length > 0)) return
    setActiveRunIds(runItems.map((item) => item.id))
    viewGroceryList()
  }

  const finishRun = () => {
    if (!activeRunIds || activeRunIds.length === 0) return
    setItems((prev) =>
      prev.map((item) => (activeRunIds.includes(item.id) ? { ...item, purchased: true } : item))
    )
    setActiveRunIds(null)
  }

  useEffect(() => {
    if (!activeRunIds || activeRunIds.length === 0) return
    const stillPending = items.some((item) => activeRunIds.includes(item.id) && !item.purchased)
    if (!stillPending) {
      setActiveRunIds(null)
    }
  }, [items, activeRunIds])

  const swapMeal = (id: string) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.id === id
          ? {
              ...meal,
              title: meal.title === 'Chef surprise' ? 'Seasonal bowl' : 'Chef surprise'
            }
          : meal
      )
    )
  }

  const viewGroceryList = () => {
    groceryListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
      <div className="grid gap-6">
        <PlanSummaryCard summary={planSummary} onUpdatePreferences={onUpdatePreferences} onViewGroceryList={viewGroceryList} />
        <MealSchedule meals={meals} mealsPerDay={preferences.mealsPerDay} onSwap={swapMeal} />
      </div>

      <div className="grid gap-6">
        <div ref={groceryListRef}>
          <GroceryList
            runItems={runItems}
            laterItems={laterItems}
            purchasedItems={purchasedItems}
            shoppingIntervalDays={shoppingIntervalDays}
            shoppingFrequencyLabel={shoppingFrequencyLabel}
            onToggleItem={toggleItem}
            onMarkAllDone={markAllDone}
            runActive={Boolean(activeRunIds && activeRunIds.length > 0)}
            onStartRun={startRun}
            onFinishRun={finishRun}
          />
        </div>
      </div>
    </section>
  )
}
