import { useMemo, useState } from 'react'
import type { GroceryListItem, TripPlan, TripTimelineStep } from '../../types'
import TripMapPanel from './TripMapPanel'
import TripTimeline from './TripTimeline'

type TripPlannerProps = {
  plan: TripPlan
  items: GroceryListItem[]
  onToggleItem: (id: string) => void
  onSetItemStore: (id: string, store: string) => void
  onMarkStoreDone: (store: string) => void
}

export default function TripPlanner({ plan, items, onToggleItem, onSetItemStore, onMarkStoreDone }: TripPlannerProps) {
  const [activeStopId, setActiveStopId] = useState<string | null>(plan.stops[0]?.id ?? null)
  const activeStop = useMemo(
    () => plan.stops.find((stop) => stop.id === activeStopId) ?? plan.stops[0],
    [plan.stops, activeStopId]
  )
  const itemsByStore = useMemo(() => {
    const map = new Map<string, GroceryListItem[]>()
    items.forEach((item) => {
      const list = map.get(item.bestStore) ?? []
      list.push(item)
      map.set(item.bestStore, list)
    })
    return map
  }, [items])
  const timelineSteps = useMemo<TripTimelineStep[]>(
    () =>
      plan.timeline.map((step) => {
        if (!step.stopId) return step
        const stop = plan.stops.find((candidate) => candidate.id === step.stopId)
        if (!stop) return step
        const count = itemsByStore.get(stop.store)?.length ?? 0
        const detailSuffix = step.detail ? ` · ${step.detail}` : ''
        return {
          ...step,
          detail: `${count} item${count === 1 ? '' : 's'}${detailSuffix}`
        }
      }),
    [plan.timeline, plan.stops, itemsByStore]
  )

  return (
    <div className="grid gap-4 rounded-3xl bg-white px-6 py-5 shadow-soft dark:bg-[#1a1411]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-ink/50 dark:text-[#c8b9a9]">Trip planner</p>
          <p className="mt-2 font-display text-2xl text-ink dark:text-[#f5f0e8]">
            {plan.runLabel} · {plan.runDate}
          </p>
          <p className="text-xs text-ink/50 dark:text-[#c8b9a9]">Suggested window: {plan.window}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <TripTimeline steps={timelineSteps} activeStopId={activeStop?.id ?? null} onStopSelect={setActiveStopId} />
        <TripMapPanel
          stops={plan.stops}
          route={plan.route}
          items={items}
          activeStopId={activeStop?.id ?? null}
          onStopSelect={setActiveStopId}
          onToggleItem={onToggleItem}
          onSetItemStore={onSetItemStore}
          onMarkStoreDone={onMarkStoreDone}
        />
      </div>
    </div>
  )
}
