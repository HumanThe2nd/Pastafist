import type { ReactNode } from 'react'

type OnboardingLayoutProps = {
  title: string
  description?: string | undefined
  eyebrow?: string
  children: ReactNode
}

export default function OnboardingLayout({ title, description, eyebrow = 'Onboarding', children }: OnboardingLayoutProps) {
  return (
    <section className="rounded-3xl bg-white/80 p-5 shadow-soft dark:bg-[#1f1714] md:p-6">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-[0.35em] text-ink/50 dark:text-[#c8b9a9]">{eyebrow}</p>
        <h2 className="mt-2 text-balance font-display text-2xl leading-tight text-ink dark:text-[#f5f0e8]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-ink/70 dark:text-[#c8b9a9]">{description}</p>
        ) : null}
      </header>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}
