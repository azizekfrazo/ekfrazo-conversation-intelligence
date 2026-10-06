import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0A500] disabled:pointer-events-none disabled:opacity-40 rounded-lg whitespace-nowrap cursor-pointer'

    const variants = {
      default:
        'bg-[#F0A500] text-[#0D1117] hover:bg-[#C87D00] hover:shadow-glow active:scale-[0.98]',
      outline:
        'border border-[#3D4450] bg-transparent text-[#C9D1D9] hover:bg-[#21262D] hover:border-[#F0A500] hover:text-[#F0F6FC]',
      ghost:
        'text-[#8B949E] hover:bg-[#21262D] hover:text-[#F0F6FC]',
      destructive:
        'bg-[#F85149] text-white hover:bg-red-700',
      secondary:
        'bg-[#1C2333] text-[#F0A500] border border-[#30363D] hover:bg-[#21262D]',
      link:
        'text-[#F0A500] underline-offset-4 hover:underline p-0 h-auto',
    }

    const sizes = {
      sm:   'h-8 px-3 text-xs',
      md:   'h-9 px-4 text-sm',
      lg:   'h-11 px-6 text-base',
      icon: 'h-9 w-9',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled ?? loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    )
  },
)
Button.displayName = 'Button'
