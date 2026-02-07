import { useMemo } from 'react'
import type { GroceryRunGroup } from '../../types'

type GroceryListProps = {
  groups: GroceryRunGroup[]
  shoppingIntervalDays: number
  shoppingFrequencyLabel: string
  onToggleItem: (id: string) => void
  onStartRun: () => void
  onFinishRun: () => void
  activeRunId: string | null
  onRunChange: (id: string | null) => void
}

const renderItem = (item: GroceryRunGroup['items'][number], onToggleItem: (id: string) => void) => {
  const bestOption = item.storeOptions.find((option) => option.store === item.bestStore) ?? item.storeOptions[0]
  const alternatives = item.storeOptions.filter((option) => option.store !== bestOption?.store)

  return (
    <div
      key={item.id}
      className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70 dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#c8b9a9]"
    >
      <label className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={item.purchased}
            onChange={() => onToggleItem(item.id)}
            className="h-4 w-4 accent-forest"
          />
          <div>
            <p className="font-medium text-ink dark:text-[#f5f0e8]">{item.name}</p>
            <p className="text-xs text-ink/50 dark:text-[#c8b9a9]">
              {item.totalNeeded} · Best at {item.bestStore}
            </p>
          </div>
        </div>
        <span className="text-xs text-ink/50 dark:text-[#c8b9a9]">{item.purchased ? 'Purchased' : 'Pending'}</span>
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink/60 dark:text-[#c8b9a9]">
        <span>
          Chosen store:{' '}
          <span className="font-medium text-ink dark:text-[#f5f0e8]">{bestOption?.store ?? item.bestStore}</span>
          {bestOption ? ` · ${bestOption.unitPrice} · ${bestOption.quantity}` : null}
        </span>
        {bestOption?.purchaseUrl ? (
          <a
            className="rounded-full border border-ink/20 px-3 py-1 text-[11px] dark:border-[#3a2b24]"
            href={bestOption.purchaseUrl}
            target="_blank"
            rel="noreferrer"
          >
            Buy link
          </a>
        ) : null}
      </div>
      {alternatives.length > 0 ? (
        <details className="mt-2 text-xs text-ink/60 dark:text-[#c8b9a9]">
          <summary className="cursor-pointer select-none">View other store options</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {alternatives.map((option) => (
              <span key={`${item.id}-${option.store}`} className="rounded-full bg-ink/5 px-3 py-1 dark:bg-[#231815]">
                {option.store} · {option.unitPrice} · {option.quantity}
              </span>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}

export default function GroceryList({
  groups,
  shoppingIntervalDays,
  shoppingFrequencyLabel,
  onToggleItem,
  onStartRun,
  onFinishRun,
  activeRunId,
  onRunChange
}: GroceryListProps) {
  const runGroups = groups.filter((group) => group.status !== 'purchased')
  const purchasedGroups = groups.filter((group) => group.status === 'purchased')

  const remaining = runGroups
    .flatMap((group) => group.items)
    .filter((item) => !item.purchased).length

  const activeGroup = useMemo(
    () => runGroups.find((group) => group.id === activeRunId) ?? runGroups[0],
    [runGroups, activeRunId]
  )

  return (
    <div className="rounded-3xl bg-white px-6 py-5 shadow-soft dark:bg-[#1a1411]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-ink/50 dark:text-[#c8b9a9]">Grocery list</p>
          <p className="mt-2 font-display text-2xl text-ink dark:text-[#f5f0e8]">{remaining} items remaining</p>
          <p className="mt-1 text-xs text-ink/60 dark:text-[#c8b9a9]">
            {shoppingFrequencyLabel} trips · Next run in {shoppingIntervalDays} days. Store choices are auto-optimized.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentGroup ? (
            <button
              className="rounded-full bg-leaf px-4 py-2 text-xs text-white dark:bg-[#d67a3f] dark:text-[#1a120f]"
              onClick={onFinishRun}
              type="button"
            >
              Mark run done
            </button>
          ) : (
            <button
              className={[
                'rounded-full px-4 py-2 text-xs',
                remaining > 0
                  ? 'bg-forest text-sand dark:bg-[#d67a3f] dark:text-[#1a120f]'
                  : 'bg-ink/10 text-ink/50 dark:bg-[#2a1f1a] dark:text-[#8d7f73]'
              ].join(' ')}
              onClick={onStartRun}
              type="button"
              disabled={remaining === 0}
            >
              I can shop now
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="flex flex-wrap gap-2">
          {runGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onRunChange(group.id)}
              className={[
                'rounded-full border px-3 py-1 text-xs',
                activeGroup?.id === group.id
                  ? 'border-leaf/50 bg-mist text-ink dark:border-[#d67a3f] dark:bg-[#231815] dark:text-[#f5f0e8]'
                  : 'border-ink/10 text-ink/50 dark:border-[#3b2923] dark:text-[#8d7f73]'
              ].join(' ')}
            >
              {group.runDate ?? group.label} · {group.items.length}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white/60 px-4 py-3 text-xs text-ink/60 dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#c8b9a9]">
          {activeGroup?.label ?? 'This run'} · {activeGroup?.items.length ?? 0} items
          {activeGroup?.subtitle ? ` · ${activeGroup.subtitle}` : ''}
        </div>

        {activeGroup?.items.length ? (
          activeGroup.items.map((item) => renderItem(item, onToggleItem))
        ) : (
          <p className="text-xs text-ink/50 dark:text-[#c8b9a9]">No items scheduled for this run.</p>
        )}

        {purchasedGroups.length > 0 ? (
          <details className="rounded-2xl border border-ink/10 bg-white/60 px-4 py-3 dark:border-[#352721] dark:bg-[#1a1411]">
            <summary className="cursor-pointer text-xs text-ink/60 dark:text-[#c8b9a9]">
              Purchased · {purchasedGroups.reduce((count, group) => count + group.items.length, 0)} items
            </summary>
            <div className="mt-3 grid gap-3">
              {purchasedGroups.map((group) =>
                group.items.map((item) => renderItem(item, onToggleItem))
              )}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  )
}
