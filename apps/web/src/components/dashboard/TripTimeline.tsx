import type { TripTimelineStep } from '../../types'

type TripTimelineProps = {
  steps: TripTimelineStep[]
  activeStopId?: string | null
  onStopSelect?: (stopId: string) => void
}

export default function TripTimeline({ steps, activeStopId, onStopSelect }: TripTimelineProps) {
  return (
    <div className="grid gap-3">
      {steps.map((step, index) => (
        <div key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="h-2 w-2 rounded-full bg-leaf dark:bg-[#d67a3f]" />
            {index < steps.length - 1 ? (
              <span className="mt-2 h-full w-px bg-ink/10 dark:bg-[#3b2923]" />
            ) : null}
          </div>
          {step.stopId ? (
            <button
              type="button"
              onClick={() => onStopSelect?.(step.stopId!)}
              className={[
                'flex-1 rounded-2xl border px-4 py-3 text-left text-sm transition',
                activeStopId === step.stopId
                  ? 'border-leaf/60 bg-white text-ink shadow-soft dark:border-[#d67a3f] dark:bg-[#1a1411] dark:text-[#f5f0e8]'
                  : 'border-ink/10 bg-white text-ink/70 hover:border-ink/20 dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#c8b9a9]'
              ].join(' ')}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50 dark:text-[#c8b9a9]">{step.time}</p>
              <p className="mt-1 font-medium">{step.label}</p>
              {step.detail ? <p className="text-xs text-ink/50 dark:text-[#c8b9a9]">{step.detail}</p> : null}
            </button>
          ) : (
            <div className="flex-1 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70 dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#c8b9a9]">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50 dark:text-[#c8b9a9]">{step.time}</p>
              <p className="mt-1 font-medium text-ink dark:text-[#f5f0e8]">{step.label}</p>
              {step.detail ? <p className="text-xs text-ink/50 dark:text-[#c8b9a9]">{step.detail}</p> : null}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
