import * as React from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border border-[#30363D] bg-[#1C2333] px-3 py-2 text-sm text-[#F0F6FC] placeholder:text-[#484F58]',
        'focus:outline-none focus:border-[#F0A500] focus:ring-2 focus:ring-[rgba(240,165,0,0.18)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'resize-none transition-colors duration-150',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
