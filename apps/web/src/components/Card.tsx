import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: 'light' | 'muted' | 'dark'
}

const tones: Record<NonNullable<CardProps['tone']>, string> = {
  light: 'bg-white shadow-soft',
  muted: 'bg-mist border border-leaf/10',
  dark: 'bg-forest/80 text-sand'
}

export default function Card({ tone = 'light', className, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-3xl p-6',
        tones[tone],
        'dark:bg-[#1f1714] dark:text-[#f5f0e8] dark:border-[#3b2923]',
        className ?? ''
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
