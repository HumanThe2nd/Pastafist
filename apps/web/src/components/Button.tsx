import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'outline'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  fullWidth?: boolean
}

const base =
  'rounded-full px-5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-leaf text-white hover:bg-leaf/90',
  ghost: 'bg-transparent text-ink/80 hover:text-ink dark:text-sand/80 dark:hover:text-sand',
  outline:
    'border border-ink/20 text-ink/80 hover:border-ink/40 dark:border-sand/30 dark:text-sand/80 dark:hover:border-sand/50'
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        base,
        variants[variant],
        fullWidth ? 'w-full justify-center' : '',
        className ?? ''
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
