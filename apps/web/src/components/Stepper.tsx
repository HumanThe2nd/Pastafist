import type { StepDefinition } from '../types/onboarding'

type StepperProps = {
  steps: StepDefinition[]
  currentStepId: StepDefinition['id']
}

export default function Stepper({ steps, currentStepId }: StepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId)

  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const isActive = index === currentIndex
        const isComplete = index < currentIndex
        return (
          <div
            key={step.id}
            className={[
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs',
              isActive
                ? 'border-leaf/50 bg-mist text-ink dark:border-[#d67a3f] dark:bg-[#231815] dark:text-[#f5f0e8]'
                : isComplete
                ? 'border-leaf/20 text-ink/60 dark:border-[#3b2923] dark:text-[#c8b9a9]'
                : 'border-ink/10 text-ink/40 dark:border-[#3b2923] dark:text-[#8d7f73]'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span
              className={[
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                isActive
                  ? 'bg-leaf text-white dark:bg-[#d67a3f] dark:text-[#1a120f]'
                  : isComplete
                  ? 'bg-leaf/20 text-ink dark:bg-[#3b2923] dark:text-[#e4d7c9]'
                  : 'bg-ink/10 text-ink/50 dark:bg-[#2a1f1a] dark:text-[#8d7f73]'
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {index + 1}
            </span>
          </div>
        )
      })}
    </div>
  )
}
