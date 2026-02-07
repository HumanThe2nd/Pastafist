import { useEffect, useRef, useState } from 'react'
import GroceryList from '../components/dashboard/GroceryList'
import MealSchedule from '../components/dashboard/MealSchedule'
import PlanSummaryCard from '../components/dashboard/PlanSummaryCard'
import { groceryRunGroups, planMeals, planSummary } from '../data/dashboard'
import { loadPreferences } from '../utils/preferences'
import { SHOPPING_FREQUENCY_OPTIONS, SHOPPING_INTERVAL_DAYS } from '../types'

type DashboardProps = {
  onUpdatePreferences: () => void
}

export default function Dashboard({ onUpdatePreferences }: DashboardProps) {
  const [preferences] = useState(loadPreferences)
  const [meals, setMeals] = useState(planMeals)
  const [groups, setGroups] = useState(groceryRunGroups)
  const groceryListRef = useRef<HTMLDivElement | null>(null)

  const shoppingIntervalDays = SHOPPING_INTERVAL_DAYS[preferences.shoppingFrequency]
  const shoppingFrequencyLabel =
    SHOPPING_FREQUENCY_OPTIONS.find((option) => option.value === preferences.shoppingFrequency)?.label ?? 'Weekly'

  const toggleItem = (id: string) => {
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) => (item.id === id ? { ...item, purchased: !item.purchased } : item))
      }))
    )
  }

  const startRun = () => {
    setGroups((prev) => {
      const hasCurrent = prev.some((group) => group.status === 'current')
      if (hasCurrent) return prev
      const nextIndex = prev.findIndex((group) => group.status === 'later')
      if (nextIndex === -1) return prev
      return prev.map((group, index) =>
        index === nextIndex ? { ...group, status: 'current' } : group
      )
    })
    viewGroceryList()
  }

  const finishRun = () => {
    setGroups((prev) =>
      prev.map((group) =>
        group.status === 'current'
          ? {
              ...group,
              status: 'purchased',
              items: group.items.map((item) => ({ ...item, purchased: true }))
            }
          : group
      )
    )
  }

  useEffect(() => {
    const current = groups.find((group) => group.status === 'current')
    if (!current) return
    if (current.items.length > 0 && current.items.every((item) => item.purchased)) {
      setGroups((prev) =>
        prev.map((group) => (group.id === current.id ? { ...group, status: 'purchased' } : group))
      )
    }
  }, [groups])

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
            groups={groups}
            shoppingIntervalDays={shoppingIntervalDays}
            shoppingFrequencyLabel={shoppingFrequencyLabel}
            onToggleItem={toggleItem}
            onStartRun={startRun}
            onFinishRun={finishRun}
          />
        </div>
      </div>
    </section>
  )
}
