import { LucideIcon } from 'lucide-react'
import { Button } from '../ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: '#1C2333', border: '1px solid #30363D' }}
      >
        <Icon className="h-6 w-6" style={{ color: '#484F58' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: '#F0F6FC' }}>
        {title}
      </h3>
      <p className="text-sm max-w-sm mb-5" style={{ color: '#8B949E' }}>
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  )
}
