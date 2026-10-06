import { cn } from '../../lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-lg', className)}
      style={{ background: '#1C2333' }}
      {...props}
    />
  )
}
