import type { PlanSummary } from '../../types'

type PlanSummaryCardProps = {
  summary: PlanSummary
  onUpdatePreferences: () => void
  onViewGroceryList: () => void
}

export default function PlanSummaryCard({
  summary,
  onUpdatePreferences,
  onViewGroceryList
}: PlanSummaryCardProps) {
  return (
    <div className="rounded-3xl border border-leaf/10 bg-mist px-6 py-5 dark:border-[#3b2923] dark:bg-[#231815]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.35em] text-ink/50 dark:text-[#c8b9a9]">{summary.periodLabel}</p>
          <h2 className="mt-2 text-balance font-display text-2xl text-ink dark:text-[#f5f0e8] md:text-3xl">
            Budget plan ready — {summary.totalCost} total
          </h2>
          <p className="mt-2 text-sm text-ink/70 dark:text-[#c8b9a9]">
            {summary.meals} meals planned · Avg cook time {summary.avgCookTime}.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink/60 dark:text-[#c8b9a9]">
            <span className="rounded-full bg-white/70 px-3 py-1 dark:bg-[#1a1411]">
              {summary.storesCompared} stores compared
            </span>
            <span className="rounded-full bg-white/70 px-3 py-1 dark:bg-[#1a1411]">
              {summary.savings} saved
            </span>
            <span className="rounded-full bg-white/70 px-3 py-1 dark:bg-[#1a1411]">
              Next run in {summary.nextRunInDays} days
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-forest px-5 py-2 text-sm text-sand dark:bg-[#d67a3f] dark:text-[#1a120f]"
            onClick={onUpdatePreferences}
            type="button"
          >
            Update preferences
          </button>
          <button
            className="rounded-full border border-ink/20 px-4 py-2 text-sm dark:border-[#3a2b24] dark:text-[#e4d7c9]"
            onClick={onViewGroceryList}
            type="button"
          >
            View grocery list
          </button>
        </div>
      </div>
    </div>
  )
}
