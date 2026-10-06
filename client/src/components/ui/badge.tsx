import * as React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'error' | 'brand'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[#1C2333] text-[#C9D1D9] border-[#30363D]',
    outline: 'bg-transparent border text-[#8B949E] border-[#30363D]',
    success: 'bg-[#12201A] text-[#3FB950] border-[#1F5231]',
    warning: 'bg-[#261900] text-[#D29922] border-[#4D3200]',
    error:   'bg-[#1F0D0D] text-[#F85149] border-[#5C1C1A]',
    brand:   'bg-[#1C2333] text-[#F0A500] border-[#4D3200]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
