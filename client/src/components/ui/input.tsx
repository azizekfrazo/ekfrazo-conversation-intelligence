import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-lg border border-[#30363D] bg-[#1C2333] px-3 py-2 text-sm text-[#F0F6FC] placeholder:text-[#484F58]',
        'focus:outline-none focus:border-[#F0A500] focus:ring-2 focus:ring-[rgba(240,165,0,0.18)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-150',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
