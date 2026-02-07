import type { InputHTMLAttributes } from 'react'

type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string
  hint?: string
}

export default function InputField({ label, hint, className, ...props }: InputFieldProps) {
  return (
    <label className="grid gap-2 text-sm text-ink/70 dark:text-[#c8b9a9]">
      <span className="text-xs uppercase tracking-[0.2em] text-ink/50 dark:text-[#c8b9a9]">{label}</span>
      <input
        className={[
          'w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-ink',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40',
          'dark:border-[#352721] dark:bg-[#1a1411] dark:text-[#f5f0e8]',
          className ?? ''
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {hint ? <span className="text-xs text-ink/50 dark:text-[#c8b9a9]">{hint}</span> : null}
    </label>
  )
}
