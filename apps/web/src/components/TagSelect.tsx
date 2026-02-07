type TagSelectProps = {
  label: string
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  helper?: string
}

export default function TagSelect({ label, options, value, onChange, helper }: TagSelectProps) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option))
    } else {
      onChange([...value, option])
    }
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/50 dark:text-[#c8b9a9]">{label}</p>
        {helper ? <p className="text-sm text-ink/60 dark:text-[#c8b9a9]">{helper}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={[
                'rounded-full px-4 py-1.5 text-sm transition',
                active
                  ? 'bg-leaf text-white dark:bg-[#d67a3f] dark:text-[#1a120f]'
                  : 'border border-ink/15 text-ink/70 hover:border-leaf/50 dark:border-[#3b2923] dark:text-[#c8b9a9]'
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
