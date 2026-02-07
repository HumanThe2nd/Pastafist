import { useMemo, useState } from 'react'
import type { PlanMeal } from '../../types'

type MealScheduleProps = {
  meals: PlanMeal[]
  mealsPerDay: number
  onSwap: (id: string) => void
}

type MealSlot = PlanMeal & {
  placeholder?: boolean
}

const slotLabels = (count: number) => {
  if (count === 1) return ['Meal']
  if (count === 2) return ['Lunch', 'Dinner']
  if (count === 3) return ['Breakfast', 'Lunch', 'Dinner']
  if (count === 4) return ['Breakfast', 'Lunch', 'Dinner', 'Snack']
  return Array.from({ length: count }, (_, index) => `Meal ${index + 1}`)
}

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function MealSchedule({ meals, mealsPerDay, onSwap }: MealScheduleProps) {
  const slots = slotLabels(Math.max(1, mealsPerDay))
  const grouped = useMemo(
    () =>
      meals.reduce<Record<string, PlanMeal[]>>((acc, meal) => {
        const bucket = acc[meal.day] ?? []
        acc[meal.day] = [...bucket, meal]
        return acc
      }, {}),
    [meals]
  )

  const schedule = useMemo(() => {
    return dayOrder.map((day) => {
      const existing = grouped[day] ?? []
      const filled: MealSlot[] = slots.map((label, index) => {
        const match = existing[index]
        if (match) {
          return {
            ...match,
            slot: match.slot || label
          }
        }
        return {
          id: `placeholder-${day}-${label}`,
          day,
          slot: label,
          title: 'Auto pick',
          ingredientCount: 0,
          placeholder: true
        }
      })
      return { day, meals: filled }
    })
  }, [grouped, slots])

  const [activeDay, setActiveDay] = useState(dayOrder[0])
  const active = schedule.find((day) => day.day === activeDay) ?? schedule[0]

  return (
    <div className="grid gap-4 rounded-3xl bg-white px-6 py-5 shadow-soft dark:bg-[#1a1411]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-2xl text-ink dark:text-[#f5f0e8]">Meal schedule</p>
        <span className="text-xs text-ink/60 dark:text-[#c8b9a9]">Week view · {mealsPerDay} per day</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {schedule.map((day) => {
          const filledCount = day.meals.filter((meal) => !meal.placeholder).length
          const isActive = day.day === active?.day
          return (
            <button
              key={day.day}
              type="button"
              onClick={() => setActiveDay(day.day)}
              className={[
                'rounded-full border px-3 py-1 text-xs',
                isActive
                  ? 'border-leaf/50 bg-mist text-ink dark:border-[#d67a3f] dark:bg-[#231815] dark:text-[#f5f0e8]'
                  : 'border-ink/10 text-ink/50 dark:border-[#3b2923] dark:text-[#8d7f73]'
              ].join(' ')}
            >
              {day.day} · {filledCount}/{mealsPerDay}
            </button>
          )
        })}
      </div>
      {active ? (
        <div className="grid gap-3">
          {active.meals.map((meal) => (
            <div
              key={meal.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70 dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#c8b9a9]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="rounded-full bg-ink/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink/60 dark:bg-[#231815] dark:text-[#c8b9a9]">
                  {meal.slot}
                </span>
                <span
                  className={[
                    'min-w-0 truncate font-medium',
                    meal.placeholder ? 'text-ink/40 dark:text-[#8d7f73]' : 'text-ink dark:text-[#f5f0e8]'
                  ].join(' ')}
                >
                  {meal.title}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span>{meal.ingredientCount} ingredients</span>
                <button
                  className="rounded-full border border-ink/15 px-3 py-1 text-xs dark:border-[#3b2923]"
                  type="button"
                  onClick={() => onSwap(meal.id)}
                  disabled={meal.placeholder}
                >
                  Swap
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
