type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
}

export default function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left dark:border-[#352721] dark:bg-[#1a1411]"
    >
      <div>
        {label ? <p className="text-sm font-medium text-ink dark:text-[#f5f0e8]">{label}</p> : null}
        {description ? (
          <p className="text-xs text-ink/50 dark:text-[#c8b9a9]">{description}</p>
        ) : null}
      </div>
      <span
        className={[
          'relative h-6 w-11 rounded-full transition',
          checked ? 'bg-leaf dark:bg-[#d67a3f]' : 'bg-ink/10 dark:bg-[#352721]'
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow',
            checked ? 'right-0.5' : 'left-0.5'
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </span>
    </button>
  )
}
